/* ---------- área do cliente ---------- */
function clientPage(u){
 return `${publicHeader(u)}<main><section class="hero"><div class="hero-l"><span class="badge" style="justify-self:start">Conta de cliente</span><h1>Olá, ${esc(u.name.split(' ')[0])}.<span>Seu próximo corte começa no app.</span></h1>
 <p class="lead">Baixe o aplicativo oficial da Seu Mustache para agendar horários, escolher o barbeiro e acompanhar seus atendimentos.</p>
 <div class="cta-row"><a class="btn" href="#plat" onclick="event.preventDefault();$('#plat').scrollIntoView({behavior:'smooth'})">${I('download',18)} Baixar o aplicativo</a><button class="btn ghost" onclick="A.logout()">Sair da conta</button></div></div>
 <div class="hero-r">${phoneMock()}</div></section>
 <section class="sec" id="plat"><div class="wrap"><h2>Escolha a sua plataforma</h2><p class="intro">Instale o aplicativo no celular e entre com este mesmo e-mail e senha.</p>${storeBtns()}
 <div class="benefits" style="grid-template-columns:repeat(3,1fr);margin-top:44px"><div>${I('cal',24)}<p><b>Agende em poucos toques</b><span>Horários livres de cada barbeiro.</span></p></div><div>${I('clock',24)}<p><b>Remarque quando precisar</b><span>Altere ou cancele pelo próprio app.</span></p></div><div>${I('star',24)}<p><b>Veja seu histórico</b><span>Serviços já feitos e próximos horários.</span></p></div></div></div></section>
 <section class="sec"><div class="wrap"><h2>O que a sua conta permite</h2><p class="intro">O painel de gestão é exclusivo de contas de administrador.</p><div style="max-width:760px">${permBox('client')}</div></div></section></main>${footer()}`}

/* ---------- mapa do projeto ---------- */
function mapPage(){
 const rows=[['1','Landing page (Stock.Tech)','Página inicial','Mantidos o cabeçalho, o hero dividido em duas áreas e os três itens com check. Menu e textos trocados para divulgação da barbearia.'],
 ['2','Dashboard','Admin · Dashboard','Mantidos os 4 indicadores, gráfico de barras, ranking, notas e alertas. Estoque virou agenda e atendimentos.'],
 ['3 e 17','Dashboard com período e Nova nota','Admin · Dashboard','Seletor de período (7 a 90 dias) e formulário de nova nota.'],
 ['4','Financeiro','Admin · Financeiro','Receita, despesas, lucro, fluxo de caixa, contas a pagar, movimentações e metas.'],
 ['5','Categorias financeiras (modal)','Admin · Financeiro','Modal de categorias com edição e nova categoria.'],
 ['6 e 7','Movimentações e Nova movimentação','Admin · Agendamentos','Entrada, saída, ajuste e devolução viraram agendado, encaixe, remarcação e bloqueio.'],
 ['8, 9, 11, 18 e 20','Produtos, formulário e categoria','Admin · Serviços','Cartões com imagem, busca, categoria e formulário. Custo e estoque deram lugar a duração e preço.'],
 ['10','Pedido de vendas','Admin · Caixa e vendas','Histórico com filtros, resumo e Nova venda. CPF parcial virou barbeiro.'],
 ['12, 13 e 19','Contatos e Novo contato','Admin · Clientes','Cartões de contato e formulário. A aba Fornecedores virou Inativos.'],
 ['14, 15 e 16','FAQ, avaliações e ticket','Admin · Ajuda','Artigos, avaliações e ticket de suporte reunidos em uma tela.'],
 ['Nova','Não existia no PDF','Login, Cadastro, Download do app, Barbeiros, Relatórios, Configurações','Telas pedidas no briefing para o fluxo de acesso e para a gestão da barbearia.']];
 return `<main class="simple"><h1>Mapa do projeto</h1><p class="muted" style="font-size:18px">Como cada tela do PDF foi adaptada e como o acesso é direcionado.</p>
 <div class="flow"><div class="st">Visitante na página inicial</div><span class="ar">›</span><div class="st">Explora serviços, barbeiros e app</div><span class="ar">›</span><div class="st">Login ou cadastro</div><span class="ar">›</span><div class="st hl">Sistema lê o perfil da conta</div><span class="ar">›</span><div class="st hl">Administrador: dashboard</div><div class="st hl">Cliente: download do app</div></div>
 <div class="tw"><table><thead><tr><th>Página do PDF</th><th>Tela original</th><th>Adaptação</th><th>O que mudou</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td style="white-space:normal;min-width:280px">${r[3]}</td></tr>`).join('')}</tbody></table></div>
 <p class="muted" style="margin-top:20px">Cores extraídas da logo: dourado médio #BDA36B (botões e destaques), dourado claro #E7D188 (títulos e hover), dourado escuro #98814D (bordas) e preto #000000 (fundo).</p>
 <p style="margin-top:20px"><a class="btn" href="#/">Voltar ao início</a></p></main>${footer()}`}

