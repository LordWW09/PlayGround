(() => {
  'use strict';

  const SAVE_KEY = 'polaris-lab-save-v1';
  const MAX_WEEKS = 6;
  const ACTIONS_PER_WEEK = 3;
  const systems = {
    architecture: 0, cpu: 0, gpu: 0, memory: 0, shaders: 0, io: 0, diagnostics: 0
  };
  const actions = [
    { id: 'architecture', icon: '⌂', tag: 'PLANEJAMENTO', title: 'Mapear interfaces públicas', text: 'Defina limites entre subsistemas e registre o que ainda não é conhecido.', cost: 12, effect: 'Arquitetura modular +1, bugs −1.', max: 2 },
    { id: 'cpu', icon: '⌘', tag: 'CPU / ARM64', title: 'Protótipo de intérprete', text: 'Implemente um caminho de referência com instruções e dados sintéticos.', cost: 24, effect: 'CPU +1, estabilidade +.', max: 3 },
    { id: 'gpu', icon: '◈', tag: 'GPU / VULKAN', title: 'Backend de render de teste', text: 'Crie um renderizador sintético e meça o orçamento de buffers.', cost: 28, effect: 'GPU +1, carga estimada −.', max: 3 },
    { id: 'memory', icon: '▤', tag: 'MEMÓRIA', title: 'Orçamento & descarte LRU', text: 'Controle alocações e descarte recursos de teste fora de uso.', cost: 20, effect: 'Memória +1, VRAM estimada −.', max: 3 },
    { id: 'shaders', icon: '✳', tag: 'SHADERS', title: 'Cache de shaders versionado', text: 'Armazene resultados sintéticos e evite trabalho repetido.', cost: 22, effect: 'Shaders +1, frame time estimado −.', max: 3 },
    { id: 'io', icon: '⌁', tag: 'SERVIÇOS HOST', title: 'Abstrações de áudio & entrada', text: 'Valide interfaces de host independentes com fixtures próprias.', cost: 18, effect: 'I/O +1, cobertura de sistema +.', max: 3 },
    { id: 'diagnostics', icon: '⌕', tag: 'VALIDAÇÃO', title: 'Instrumentação & testes', text: 'Adicione logs, cenários reproduzíveis e detecção de regressões.', cost: 16, effect: 'Diagnóstico +1, reduz bugs.', max: 3 }
  ];
  const testSpecs = [
    { id: 'cpu', name: 'CPU · fluxo de referência', desc: 'Valida operações aritméticas próprias, estado e consistência do intérprete de teste.', need: ['cpu', 1] },
    { id: 'gpu', name: 'GPU · orçamento de render', desc: 'Exercita alocações sintéticas, estimativa de VRAM e render de padrões próprios.', need: ['gpu', 1] },
    { id: 'memory', name: 'Memória · pressão & descarte', desc: 'Verifica o limite configurado e descarte controlado de recursos simulados.', need: ['memory', 1] },
    { id: 'io', name: 'Serviços · áudio & controles', desc: 'Executa fixtures artificiais para rotas de entrada e saída do host.', need: ['io', 1] }
  ];
  const phases = [
    { name: 'Escopo, arquitetura e análise de licença', desc: 'Separar subsistemas, incógnitas documentais e obrigações de dependências.', check: s => s.systems.architecture >= 1 },
    { name: 'Modelo de CPU e testes de referência', desc: 'Validar um intérprete de teste antes de considerar tradução dinâmica.', check: s => s.systems.cpu >= 1 && s.testRuns > 0 },
    { name: 'Orçamento de memória e VRAM', desc: 'Medir alocações sintéticas sob limite ajustável e observar descarte.', check: s => s.systems.memory >= 1 && s.testRuns > 0 },
    { name: 'Renderizador Vulkan de padrões próprios', desc: 'Exercitar recursos gráficos sintéticos e um orçamento explícito.', check: s => s.systems.gpu >= 1 && s.testRuns > 0 },
    { name: 'Shaders, cache e I/O do host', desc: 'Persistência versionada e serviços de áudio/entrada com fixtures legais.', check: s => s.systems.shaders >= 1 && s.systems.io >= 1 },
    { name: 'Relatório de estabilidade reproduzível', desc: 'Repetir a bateria, registrar limitações e documentar o que não foi validado.', check: s => s.systems.diagnostics >= 1 && s.testRuns >= 2 }
  ];

  const $ = id => document.getElementById(id);
  const freshState = () => ({ week: 1, ap: ACTIONS_PER_WEEK, credits: 120, bugs: 2, systems: { ...systems }, profile: 'balanced', budget: 3, testRuns: 0, lastTests: null, logs: [], complete: false, dismissedNotice: false });
  let state = loadState();
  let toastTimer;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved || typeof saved !== 'object') return freshState();
      const base = freshState();
      const merged = { ...base, ...saved, systems: { ...systems, ...(saved.systems || {}) } };
      merged.week = clampInt(merged.week, 1, MAX_WEEKS);
      merged.ap = clampInt(merged.ap, 0, ACTIONS_PER_WEEK);
      merged.credits = Math.max(0, Number(merged.credits) || 0);
      merged.bugs = clampInt(merged.bugs, 0, 99);
      merged.budget = clamp(Number(merged.budget) || 3, 2, 3.8);
      merged.systems = Object.fromEntries(Object.entries(systems).map(([k, max]) => [k, clampInt(merged.systems[k], 0, k === 'architecture' ? 2 : 3)]));
      merged.logs = Array.isArray(merged.logs) ? merged.logs.slice(0, 25) : [];
      return merged;
    } catch { return freshState(); }
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { showToast('Não foi possível salvar neste navegador.'); }
  }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function clampInt(value, min, max) { return Math.round(clamp(Number(value) || 0, min, max)); }
  function esc(value) { return String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]); }
  function log(message) {
    const now = new Date();
    state.logs.unshift({ week: state.week, time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), message });
    state.logs = state.logs.slice(0, 25);
  }
  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }
  function totalLevels() { return Object.values(state.systems).reduce((a, b) => a + b, 0); }
  function health() {
    const levels = totalLevels();
    const avg = state.lastTests ? state.lastTests.results.reduce((n, r) => n + (r.status === 'PASSOU' ? 1 : r.status === 'PARCIAL' ? .5 : 0), 0) : 0;
    return Math.round(clamp(8 + levels * 5 + Math.min(state.testRuns, 3) * 4 + avg * 2 - state.bugs * 2, 0, 100));
  }
  function estimates() {
    const p = { eco: .78, balanced: 1, quality: 1.24 }[state.profile] || 1;
    const gpu = clamp(Math.round((48 + state.systems.gpu * 6 - state.systems.memory * 3) * p), 8, 99);
    const vram = clamp(1.15 + state.systems.gpu * .24 + state.systems.shaders * .14 - state.systems.memory * .23 + (p - 1) * .8, .45, 3.9);
    const ram = clamp(5.3 + state.systems.cpu * .35 + state.systems.shaders * .18 + state.systems.diagnostics * .12, 3.5, 14.5);
    const frame = clamp(29.8 + (p - 1) * 9 - state.systems.gpu * 1.35 - state.systems.shaders * 1.1 + state.systems.cpu * .25, 10, 58);
    return { gpu, vram, ram, frame };
  }
  function renderResources() {
    const e = estimates();
    $('vramValue').textContent = e.vram.toFixed(1);
    $('vramMeter').style.width = `${clamp(e.vram / 4 * 100, 2, 100)}%`;
    $('vramState').textContent = e.vram > state.budget ? 'ACIMA DO LIMITE' : e.vram > state.budget * .8 ? 'ATENÇÃO' : 'FOLGA';
    $('vramState').style.color = e.vram > state.budget ? 'var(--red)' : '';
    $('ramValue').textContent = e.ram.toFixed(1);
    $('ramMeter').style.width = `${e.ram / 16 * 100}%`;
    $('ramState').textContent = e.ram > 12 ? 'PRESSÃO' : 'NORMAL';
    $('gpuValue').textContent = e.gpu;
    $('gpuMeter').style.width = `${e.gpu}%`;
    $('gpuState').textContent = e.gpu > 78 ? 'ALTA' : e.gpu > 55 ? 'MODERADA' : 'LEVE';
    $('frameValue').textContent = e.frame.toFixed(1);
    $('frameMeter').style.width = `${clamp(e.frame / 50 * 100, 4, 100)}%`;
    $('frameState').textContent = e.frame <= 33.3 ? 'NO ALVO' : 'ACIMA DA META';
  }
  function renderActions() {
    const root = $('workGrid');
    root.innerHTML = actions.map(a => {
      const level = state.systems[a.id];
      const full = level >= a.max;
      const can = state.ap > 0 && state.credits >= a.cost && !full && !state.complete;
      return `<article class="work-card"><div class="work-top"><span class="work-icon">${a.icon}</span><span class="work-tag">${a.tag}</span><span class="work-level">NÍVEL ${level}/${a.max}</span></div><h3>${a.title}</h3><p>${a.text}</p><div class="work-bottom"><span class="cost"><span>${a.cost} CR</span> · 1 ação</span><span class="level-pips">${Array.from({ length:a.max }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('')}</span><button class="work-button" data-action="${a.id}" ${can ? '' : 'disabled'}>${full ? 'Concluído' : 'Desenvolver'}</button></div></article>`;
    }).join('');
    root.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => takeAction(button.dataset.action)));
  }
  function renderLog() {
    $('eventLog').innerHTML = state.logs.length ? state.logs.map(entry => `<div class="log-entry"><time>S${String(entry.week).padStart(2, '0')} · ${esc(entry.time)}</time><span>${esc(entry.message)}</span></div>`).join('') : '<div class="log-entry"><time>INÍCIO</time><span><b>Bancada pronta.</b> Escolha uma ação para começar o primeiro sprint.</span></div>';
  }
  function renderMilestones() {
    const checks = [
      { done: state.systems.architecture > 0, title: 'Arquitetura modular', sub: 'Mapa de interfaces e riscos' },
      { done: state.systems.cpu > 0 && state.testRuns > 0, title: 'CPU de referência', sub: 'Protótipo + bateria executada' },
      { done: state.systems.memory > 0 && state.systems.gpu > 0, title: 'Orçamento de recursos', sub: 'Memória e render sintéticos' },
      { done: state.systems.io > 0 && state.systems.diagnostics > 0 && state.testRuns > 1, title: 'Validação reproduzível', sub: 'I/O, logs e repetição de testes' }
    ];
    const count = checks.filter(c => c.done).length;
    $('checkCount').textContent = `${count} / ${checks.length}`;
    $('milestoneList').innerHTML = checks.map(c => `<div class="milestone ${c.done ? 'done' : ''}"><span class="milestone-mark">${c.done ? '✓' : '·'}</span><div><b>${c.title}</b><small>${c.sub}</small></div></div>`).join('');
    const completePhases = phases.filter(p => p.check(state)).length;
    $('roadmapProgress').textContent = `${Math.round(completePhases / phases.length * 100)}%`;
    $('phaseList').innerHTML = phases.map((p, i) => {
      const done = p.check(state);
      return `<div class="phase-row ${done ? 'done' : ''}"><span class="phase-num">${done ? '✓' : String(i + 1).padStart(2, '0')}</span><div><b>${p.name}</b><p>${p.desc}</p></div><span class="phase-status">${done ? 'VALIDADO*' : 'PENDENTE'}</span></div>`;
    }).join('');
  }
  function renderTests() {
    const results = state.lastTests?.results || [];
    $('testGrid').innerHTML = testSpecs.map(spec => {
      const result = results.find(r => r.id === spec.id);
      const status = result?.status || 'NÃO EXECUTADO';
      const cls = status === 'PASSOU' ? 'pass' : status === 'PARCIAL' ? 'partial' : '';
      return `<article class="test-card"><div class="test-card-head"><span class="section-kicker">SYNTHETIC / ${spec.id.toUpperCase()}</span><span class="test-result ${cls}">${status}</span></div><h3>${spec.name}</h3><p>${result ? esc(result.detail) : spec.desc}</p></article>`;
    }).join('');
    if (state.lastTests) {
      $('lastRunTitle').textContent = `Sprint ${String(state.lastTests.week).padStart(2, '0')} · ${state.lastTests.passed}/4 completos`;
      $('lastRunText').textContent = `Execução ${state.testRuns}; resultado sintético. Não indica compatibilidade com console ou jogos.`;
      $('testReport').textContent = makeReport();
    } else {
      $('lastRunTitle').textContent = 'Ainda não executada';
      $('lastRunText').textContent = 'Monte os subsistemas no Painel e rode a bateria sintética quando estiver pronto.';
      $('testReport').textContent = 'POLARIS LAB / SYNTHETIC TEST HARNESS\nNenhuma execução registrada.';
    }
  }
  function render() {
    $('weekNumber').textContent = String(state.week).padStart(2, '0');
    $('weekTag').textContent = `SEMANA ${String(state.week).padStart(2, '0')} / ${String(MAX_WEEKS).padStart(2, '0')}`;
    $('actionLabel').textContent = state.complete ? 'campanha concluída' : `${state.ap} ${state.ap === 1 ? 'ação disponível' : 'ações disponíveis'}`;
    $('apCount').textContent = state.ap;
    $('creditsValue').innerHTML = `${Math.floor(state.credits)} <small>CR</small>`;
    $('bugsValue').textContent = state.bugs;
    $('healthScore').textContent = health();
    $('healthMeter').style.width = `${health()}%`;
    $('healthCopy').textContent = health() < 25 ? 'Fundação inicial — ainda não validada.' : health() < 55 ? 'Protótipo em construção — validação parcial.' : health() < 80 ? 'Base promissora — ainda limitada a testes sintéticos.' : 'Bancada madura — compatibilidade real segue não verificada.';
    $('profileSelect').value = state.profile;
    $('budgetRange').value = state.budget;
    $('budgetLabel').textContent = Number(state.budget).toFixed(1);
    $('endWeekBtn').innerHTML = state.week >= MAX_WEEKS || state.complete ? 'Encerrar campanha <span>→</span>' : 'Fechar sprint <span>→</span>';
    $('endWeekBtn').disabled = state.complete;
    $('endWeekBtn').style.opacity = state.complete ? '.55' : '';
    $('weekHint').textContent = state.complete ? 'Campanha finalizada. Reinicie para tentar uma estratégia diferente.' : state.ap > 0 ? 'Você pode fechar o sprint com ações restantes; ações não usadas não acumulam.' : 'Sem ações restantes. Feche o sprint para receber o próximo orçamento.';
    $('dismissNotice').closest('.notice').style.display = state.dismissedNotice ? 'none' : '';
    renderResources(); renderActions(); renderLog(); renderMilestones(); renderTests();
    save();
  }
  function takeAction(id) {
    const action = actions.find(a => a.id === id);
    if (!action || state.complete) return;
    if (state.ap < 1) return showToast('Sem ações disponíveis. Feche o sprint para continuar.');
    if (state.credits < action.cost) return showToast('Créditos insuficientes. Feche o sprint para receber orçamento.');
    if (state.systems[id] >= action.max) return showToast('Este subsistema já atingiu o nível máximo.');
    state.credits -= action.cost;
    state.ap--;
    state.systems[id]++;
    if (id === 'architecture' || id === 'diagnostics') state.bugs = Math.max(0, state.bugs - 1);
    if (id === 'cpu' && state.systems.cpu > 1 && Math.random() < .25) state.bugs++;
    log(`<b>${action.title}</b> concluído. ${action.effect}`);
    render();
    showToast(`${action.title}: progresso registrado.`);
  }
  function runTests() {
    if (state.complete) return showToast('A campanha foi encerrada. Reinicie para jogar novamente.');
    if (state.ap < 1) return showToast('A bateria consome 1 ação. Feche o sprint para continuar.');
    if (state.credits < 10) return showToast('São necessários 10 CR para executar a bateria.');
    state.ap--;
    state.credits -= 10;
    state.testRuns++;
    const e = estimates();
    const results = testSpecs.map(spec => {
      const [system, min] = spec.need;
      const level = state.systems[system];
      let status = 'FALHOU';
      let detail = 'Sem protótipo correspondente. Desenvolva o subsistema e repita o teste sintético.';
      if (level >= min) {
        const resourceOk = spec.id !== 'gpu' || e.vram <= state.budget;
        const quality = level + state.systems.diagnostics * .5 + state.systems.architecture * .25;
        if (resourceOk && quality >= 2.2) {
          status = 'PASSOU';
          detail = spec.id === 'gpu' ? `Render de padrões próprios dentro do orçamento sintético (${e.vram.toFixed(1)} / ${state.budget.toFixed(1)} GB).` : 'Cenário próprio executado com verificações básicas; não representa software de console.';
        } else {
          status = 'PARCIAL';
          detail = !resourceOk ? `Estimativa ${e.vram.toFixed(1)} GB supera o orçamento de ${state.budget.toFixed(1)} GB; reduza carga ou aumente o limite.` : 'Caminho básico executado; amplie cobertura e instrumentação para fortalecer a validação.';
        }
      }
      return { id: spec.id, status, detail };
    });
    const passed = results.filter(r => r.status === 'PASSOU').length;
    const improved = results.filter(r => r.status === 'PASSOU' || r.status === 'PARCIAL').length;
    if (passed >= 2) state.bugs = Math.max(0, state.bugs - 1);
    else if (!improved) state.bugs = Math.min(9, state.bugs + 1);
    state.lastTests = { week: state.week, passed, results, profile: state.profile, budget: state.budget, estimates: e, run: state.testRuns };
    log(`<b>Bateria sintética ${passed >= 3 ? 'sólida' : improved ? 'parcial' : 'reprovada'}:</b> ${passed}/4 passaram; ${improved - passed} parciais. Sem alegação de compatibilidade real.`);
    render();
    showToast(`Bateria encerrada: ${passed}/4 testes passaram.`);
    if (document.querySelector('#benchView.active')) $('benchRunBtn').focus({ preventScroll: true });
  }
  function makeReport() {
    const t = state.lastTests;
    if (!t) return 'POLARIS LAB / SYNTHETIC TEST HARNESS\nNenhuma execução registrada.';
    return [
      'POLARIS LAB / RELATÓRIO DE TESTE SINTÉTICO',
      `Data: ${new Date().toLocaleString('pt-BR')}`,
      `Sprint: ${String(t.week).padStart(2, '0')} | Execução: ${t.run}`,
      `Perfil: ${t.profile} | Orçamento VRAM: ${Number(t.budget).toFixed(1)} GB`,
      `Estimativas sintéticas: VRAM ${t.estimates.vram.toFixed(1)} GB; RAM ${t.estimates.ram.toFixed(1)} GB; GPU ${t.estimates.gpu}%; frame time ${t.estimates.frame.toFixed(1)} ms`,
      `Resultado: ${t.passed}/4 completos`, '',
      ...t.results.map(r => `${r.status.padEnd(12)} ${r.id.toUpperCase()} — ${r.detail}`), '',
      `Níveis: ${Object.entries(state.systems).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      `Bugs abertos: ${state.bugs} | Saúde do protótipo (jogo): ${health()}/100`, '',
      'LIMITAÇÃO: Cargas artificiais e stubs próprios. Não executa código ARM, jogos ou firmware; não testa compatibilidade de console.',
      'Nenhum jogo, firmware, chave ou conteúdo proprietário foi incluído.'
    ].join('\n');
  }
  function closeWeek() {
    if (state.complete) return;
    if (state.week >= MAX_WEEKS) {
      state.complete = true;
      log(`<b>Campanha encerrada.</b> Saúde simulada ${health()}/100; ${state.testRuns} baterias executadas. O protótipo continua sem compatibilidade real verificada.`);
      render();
      showEnding();
      return;
    }
    const finishedWeek = state.week;
    state.week++;
    state.ap = ACTIONS_PER_WEEK;
    const grant = 44 + (state.week % 2 ? 6 : 0);
    state.credits += grant;
    if (state.week === 3 && state.systems.diagnostics === 0) {
      state.bugs = Math.min(9, state.bugs + 1);
      log(`<b>Regressão encontrada.</b> Sem instrumentação, o sprint revelou um bug adicional (+1).`);
    }
    if (state.week === 5 && state.systems.memory === 0) log('<b>Risco de memória sinalizado.</b> O orçamento ainda não tem descarte controlado.');
    log(`<b>Sprint ${String(finishedWeek).padStart(2, '0')} fechado.</b> Novo orçamento +${grant} CR; 3 ações restauradas.`);
    render();
    showToast(`Sprint ${String(finishedWeek).padStart(2, '0')} fechado. +${grant} CR.`);
  }
  function showEnding() {
    const score = health();
    let title, text;
    if (score >= 72 && state.testRuns >= 2) {
      title = 'Bancada validada';
      text = `Você construiu uma base de testes consistente, com saúde simulada ${score}/100. Isso valida apenas a disciplina de engenharia e as cargas sintéticas — compatibilidade com qualquer console permanece desconhecida.`;
    } else if (score >= 40) {
      title = 'Protótipo promissor';
      text = `A campanha terminou com saúde ${score}/100. Há fundamentos, mas faltou cobertura ou validação repetida. Nenhum resultado comprova compatibilidade real.`;
    } else {
      title = 'Viabilidade inconclusiva';
      text = `A bancada terminou com saúde ${score}/100. A equipe priorizou trabalho sem fechar validações suficientes; registre riscos e tente outra estratégia. Não há compatibilidade real demonstrada.`;
    }
    const dialog = $('aboutDialog');
    dialog.querySelector('.section-kicker').textContent = 'RESULTADO DA CAMPANHA';
    dialog.querySelector('h2').textContent = title;
    dialog.querySelector('p').textContent = text;
    $('gotItBtn').innerHTML = 'Ver painel <span>✓</span>';
    if (!dialog.open) dialog.showModal();
  }
  function switchView(name) {
    const names = { dashboard: 'PAINEL DO PROJETO', roadmap: 'ARQUITETURA & PLANO', bench: 'LABORATÓRIO DE TESTES' };
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === `${name}View`));
    document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    $('crumbTitle').textContent = names[name] || names.dashboard;
    $('sidebar').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function reset() {
    if (!window.confirm('Reiniciar a campanha? Todo o progresso local será apagado.')) return;
    state = freshState();
    log('<b>Nova campanha iniciada.</b> Orçamento de 120 CR, seis sprints e três ações por sprint.');
    render();
    switchView('dashboard');
    showToast('Nova campanha pronta.');
  }
  function init() {
    if (!state.logs.length) log('<b>Bancada pronta.</b> Seis sprints disponíveis. Comece pela arquitetura ou invista em um protótipo sintético.');
    document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
    $('endWeekBtn').addEventListener('click', closeWeek);
    $('testButton').addEventListener('click', runTests);
    $('benchRunBtn').addEventListener('click', runTests);
    $('profileSelect').addEventListener('change', event => { state.profile = event.target.value; log(`<b>Perfil ajustado:</b> ${event.target.options[event.target.selectedIndex].text}. Métricas são apenas estimativas sintéticas.`); render(); });
    $('budgetRange').addEventListener('input', event => { state.budget = Number(event.target.value); $('budgetLabel').textContent = state.budget.toFixed(1); renderResources(); save(); });
    $('resetBtn').addEventListener('click', reset);
    $('dismissNotice').addEventListener('click', () => { state.dismissedNotice = true; render(); });
    $('roadmapLink').addEventListener('click', () => switchView('roadmap'));
    $('hardwareBtn').addEventListener('click', () => showToast('Máquina-alvo de referência; métricas exibidas são sintéticas, não telemetria real.'));
    $('menuBtn').addEventListener('click', () => $('sidebar').classList.toggle('open'));
    $('aboutBtn').addEventListener('click', () => $('aboutDialog').showModal());
    $('closeAbout').addEventListener('click', () => $('aboutDialog').close());
    $('gotItBtn').addEventListener('click', () => $('aboutDialog').close());
    $('downloadReport').addEventListener('click', () => {
      if (!state.lastTests) return showToast('Execute uma bateria antes de baixar o relatório.');
      const blob = new Blob([makeReport()], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `polaris-lab-relatorio-sprint-${String(state.lastTests.week).padStart(2, '0')}.txt`;
      link.click(); URL.revokeObjectURL(url);
      showToast('Relatório sintético baixado.');
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') $('sidebar').classList.remove('open'); });
    render();
  }
  init();
})();
