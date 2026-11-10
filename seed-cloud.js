/* Supabase auth and campaign access for SEED. The browser only uses the public anon key. */
(() => {
  'use strict';
  const config = window.SEED_SUPABASE_CONFIG || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url || '') &&
    typeof config.anonKey === 'string' && config.anonKey.length > 20 && !config.anonKey.includes('SUA_CHAVE');
  let client = null;
  let identity = null;
  let debounce;
  let access = new Map();
  const $ = (selector, root = document) => root.querySelector(selector);
  const escape = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const errorText = error => error?.message || 'Não foi possível concluir a operação.';
  const notify = message => window.SEED_APP_TOAST ? window.SEED_APP_TOAST(message) : alert(message);

  function gateMarkup(message = '') {
    let root = $('#seed-auth-gate');
    if (!root) {
      root = document.createElement('div');
      root.id = 'seed-auth-gate';
      root.innerHTML = `<section class="seed-auth-card"><div class="seed-auth-brand">✦ <b>SEED</b></div><p class="seed-auth-kicker">GRIMÓRIO VIRTUAL</p><h1>Entre para sua mesa</h1><p class="seed-auth-copy">Acesse campanhas compartilhadas como jogador. O papel de Mestre é atribuído pela administração do projeto.</p><div class="seed-auth-tabs"><button type="button" data-auth-mode="login" class="active">Entrar</button><button type="button" data-auth-mode="signup">Criar conta</button></div><form id="seed-auth-form"><div class="seed-auth-name" hidden><label>Nome de exibição<input name="displayName" maxlength="80" autocomplete="name"></label></div><label>E-mail<input name="email" type="email" required autocomplete="email"></label><label>Senha<input name="password" type="password" minlength="8" required autocomplete="current-password"></label><button class="seed-auth-submit" type="submit">Entrar</button><p class="seed-auth-error" aria-live="polite"></p></form><small>Use o endereço e a chave pública (anon) do seu projeto Supabase. Nunca coloque uma chave service_role no navegador.</small></section>`;
      document.body.append(root);
      root.addEventListener('click', event => {
        const tab = event.target.closest('[data-auth-mode]');
        if (!tab) return;
        root.dataset.mode = tab.dataset.authMode;
        root.querySelectorAll('[data-auth-mode]').forEach(button => button.classList.toggle('active', button === tab));
        $('.seed-auth-name', root).hidden = root.dataset.mode !== 'signup';
        $('input[name="password"]', root).autocomplete = root.dataset.mode === 'signup' ? 'new-password' : 'current-password';
        $('.seed-auth-submit', root).textContent = root.dataset.mode === 'signup' ? 'Criar conta' : 'Entrar';
        $('.seed-auth-error', root).textContent = '';
      });
      $('#seed-auth-form', root).addEventListener('submit', submitAuth);
    }
    $('.seed-auth-error', root).textContent = message;
    return root;
  }

  function removeGate() { $('#seed-auth-gate')?.remove(); }

  async function submitAuth(event) {
    event.preventDefault();
    const root = $('#seed-auth-gate'), form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const button = $('.seed-auth-submit', form);
    const error = $('.seed-auth-error', form);
    button.disabled = true;
    error.textContent = '';
    try {
      if (root.dataset.mode === 'signup') {
        const { data, error: authError } = await client.auth.signUp({
          email: values.email, password: values.password,
          options: { data: { display_name: values.displayName } }
        });
        if (authError) throw authError;
        if (!data.session) {
          error.textContent = 'Conta criada. Confirme seu e-mail e depois entre.';
          button.disabled = false;
          return;
        }
        await client.rpc('seed_create_profile', { p_display_name: values.displayName });
      } else {
        const { error: authError } = await client.auth.signInWithPassword({ email: values.email, password: values.password });
        if (authError) throw authError;
      }
      await finishLogin();
    } catch (problem) {
      error.textContent = errorText(problem);
      button.disabled = false;
    }
  }

  async function finishLogin() {
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) throw userError || new Error('Sessão não encontrada.');
    let { data: profile, error } = await client.from('seed_profiles').select('user_id,display_name,app_role').eq('user_id', userData.user.id).maybeSingle();
    if (error) throw error;
    if (!profile) {
      const metadata = userData.user.user_metadata || {};
      const { data, error: profileError } = await client.rpc('seed_create_profile', {
        p_display_name: metadata.display_name || userData.user.email
      });
      if (profileError) throw profileError;
      profile = data;
    }
    identity = { user: userData.user, profile };
    removeGate();
    document.body.classList.remove('seed-auth-required');
    updateProfile();
    window.dispatchEvent(new CustomEvent('seed:authenticated', { detail: identity }));
  }

  function updateProfile() {
    const card = $('.profile');
    if (!card || !identity) return;
    const name = identity.profile.display_name || identity.user.email || 'Aventureiro';
    const role = identity.profile.app_role === 'master' ? 'Mestre' : 'Jogador';
    card.innerHTML = `<div class="avatar avatar-gold">${escape(name.trim()[0]?.toUpperCase() || 'S')}</div><div><b>${escape(name)}</b><small>${role} · conta conectada</small></div><button id="seed-sign-out" title="Sair da conta">↪</button>`;
    $('#seed-sign-out').addEventListener('click', async () => {
      if (!confirm('Sair da sua conta SEED?')) return;
      await client.auth.signOut();
      identity = null;
      access.clear();
      location.reload();
    });
    const localCard = $('.local-card');
    if (localCard) localCard.innerHTML = '<span class="local-dot"></span><div><b>Conta conectada</b><small>Campanhas sincronizadas pelo Supabase</small></div>';
  }

  async function loadCampaigns() {
    if (!identity) return null;
    const [{ data: rows, error }, { data: memberships, error: memberError }] = await Promise.all([
      client.from('seed_campaigns').select('id,owner_id,payload,updated_at'),
      client.from('seed_campaign_members').select('campaign_id,user_id,member_role,status').eq('user_id', identity.user.id)
    ]);
    if (error) throw error;
    if (memberError) throw memberError;
    access = new Map();
    (rows || []).forEach(row => access.set(row.id, row.owner_id === identity.user.id ? 'owner' : 'member'));
    (memberships || []).forEach(member => access.set(member.campaign_id, member.status === 'active' ? 'member' : 'pending'));
    const campaigns = (rows || []).map(row => ({ ...row.payload, id: row.id, _seedOwnerId: row.owner_id, _seedAccess: access.get(row.id), _seedSystem: row.payload?._seedSystem || null }));
    const characters = campaigns.flatMap(campaign => campaign._seedCharacters || []);
    campaigns.forEach(campaign => { delete campaign._seedCharacters; });
    return { campaigns, characters, requests: (memberships || []).filter(member => member.status === 'pending'), access: Object.fromEntries(access) };
  }

  async function persistCampaigns(state) {
    if (!identity) return;
    for (const campaign of state.campaigns || []) {
      const permission = access.get(campaign.id);
      if (permission === 'pending') continue;
      const payload = { ...campaign, _seedCharacters: (state.characters || []).filter(character => character.campaignId === campaign.id), _seedSystem: (state.systems || []).find(system => system.id === campaign.systemId) || null };
      delete payload._seedOwnerId;
      delete payload._seedAccess;
      if (permission === 'owner') {
        const { error } = await client.from('seed_campaigns').update({ payload, updated_at: new Date().toISOString() }).eq('id', campaign.id);
        if (error) throw error;
      } else if (permission === 'member') {
        const { error } = await client.from('seed_campaigns').update({ payload, updated_at: new Date().toISOString() }).eq('id', campaign.id);
        if (error) throw error;
      } else if (identity.profile.app_role === 'master') {
        const { error } = await client.from('seed_campaigns').insert({ id: campaign.id, owner_id: identity.user.id, payload });
        if (error && error.code !== '23505') throw error;
        if (error?.code === '23505') throw new Error('Esta campanha já existe na nuvem, mas você não tem acesso para editá-la.');
        access.set(campaign.id, 'owner');
      }
    }
  }

  function scheduleSave(state) {
    if (!identity) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => persistCampaigns(state).catch(problem => notify(`Falha ao sincronizar: ${errorText(problem)}`)), 500);
  }

  async function listMembers(campaignId) {
    const { data, error } = await client.from('seed_campaign_members').select('user_id,member_role,status,joined_at').eq('campaign_id', campaignId);
    if (error) throw error;
    return data || [];
  }

  async function listJoinRequests() {
    const ids = [...access].filter(([, role]) => role === 'owner').map(([id]) => id);
    if (!ids.length) return [];
    const { data, error } = await client.from('seed_campaign_members').select('campaign_id,user_id,member_role,status,joined_at').in('campaign_id', ids).eq('status', 'pending');
    if (error) throw error;
    return data || [];
  }

  async function initialize() {
    if (!configured) return { configured: false, identity: null };
    if (!window.supabase?.createClient) throw new Error('A biblioteca Supabase não carregou. Verifique a conexão e recarregue.');
    client = window.supabase.createClient(config.url, config.anonKey);
    document.body.classList.add('seed-auth-required');
    gateMarkup();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) return { configured: true, identity: null };
    try {
      await finishLogin();
      return { configured: true, identity };
    } catch (problem) {
      gateMarkup(`Falha ao carregar o perfil: ${errorText(problem)}`);
      await client.auth.signOut();
      return { configured: true, identity: null };
    }
  }

  window.SEED_CLOUD = {
    get configured() { return configured; },
    get identity() { return identity; },
    initialize,
    loadCampaigns,
    scheduleSave,
    createInvite: campaignId => client.rpc('seed_create_invite', { p_campaign_id: campaignId }),
    requestJoin: token => client.rpc('seed_request_join', { p_invite_token: token }),
    approveMember: (campaignId, userId) => client.rpc('seed_approve_member', { p_campaign_id: campaignId, p_user_id: userId }),
    removeMember: (campaignId, userId) => client.rpc('seed_remove_member', { p_campaign_id: campaignId, p_user_id: userId }),
    listMembers,
    listJoinRequests,
    async refresh() {
      const loaded = await loadCampaigns();
      if (loaded) window.dispatchEvent(new CustomEvent('seed:campaigns-loaded', { detail: loaded }));
      return loaded;
    }
  };
})();
