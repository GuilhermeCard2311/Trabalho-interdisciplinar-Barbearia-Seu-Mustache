# Barbearia Seu Mustache — site + painel + API

Front (HTML/CSS/JS puro) e backend em **Node.js** com banco **SQLite embutido**. Sem `npm install`: não há dependências externas.

Requisito: **Node 22.13 ou mais novo** (`node -v`).

## Rodar

```bash
npm start
```

Abra **http://localhost:3000** (não abra o `index.html` direto do arquivo: o site precisa falar com o servidor).

Na primeira execução, em modo demonstração, o servidor cria o banco em `backend/data/seumustache.db` com dados de exemplo e duas contas:

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | admin@seumustache.demo | admin123 |
| Cliente | cliente@seumustache.demo | cliente123 |

## Testes

```bash
npm test
```

## Colocar no ar (produção)

```bash
NODE_ENV=production ADMIN_EMAIL=dono@suabarbearia.com.br ADMIN_PASSWORD='uma-senha-forte' HOST=0.0.0.0 PORT=3000 npm start
```

- Em produção **não** há contas nem dados de exemplo: o primeiro administrador vem de `ADMIN_EMAIL` / `ADMIN_PASSWORD` (mínimo 8 caracteres), usados só na primeira execução. Depois disso, o banco já tem o admin e essas variáveis são ignoradas.
- Coloque o servidor atrás de **HTTPS** (Nginx, Caddy, Cloudflare...). Se usar proxy, defina `TRUST_PROXY=1` para o limite de tentativas de login enxergar o IP real.
- **Backup:** copie a pasta `backend/data/` (o banco está em modo WAL; o ideal é copiar com o servidor parado).

Variáveis: `PORT` (3000), `HOST` (127.0.0.1), `DB_PATH`, `APP_TZ` (America/Sao_Paulo), `SEED_DEMO=0` (não criar dados de exemplo), `TRUST_PROXY`.

## Estrutura

```
index.html  css/  js/        site e painel (js/api.js fala com o servidor)
backend/
  server.js   servidor HTTP, rotas /api e arquivos do site
  db.js       tabelas SQLite, validação e CRUD
  auth.js     senhas (scrypt), sessões e limite de tentativas
  seed.js     dados de exemplo e criação do 1º administrador
  test.js     testes de integração
```

## API

Autenticação por `Authorization: Bearer <token>` (token devolvido no login/cadastro, válido por 7 dias).

| Método e rota | Quem | O que faz |
|---|---|---|
| `GET /api/public` | todos | serviços, barbeiros ativos, avaliações e contatos |
| `POST /api/auth/login` | todos | `{email, password}` → `{token, user}` |
| `POST /api/auth/signup` | todos | `{name, email, phone, password}` cria conta de cliente |
| `POST /api/auth/logout` · `GET /api/auth/me` | logado | encerra a sessão · dados do usuário |
| `GET /api/admin/state` | admin | todos os dados do painel |
| `GET/POST /api/admin/{recurso}` | admin | listar / criar |
| `PUT/DELETE /api/admin/{recurso}/{id}` | admin | editar / excluir |
| `PUT /api/admin/settings` · `PUT /api/admin/cats` | admin | configurações · categorias financeiras |
| `POST /api/admin/users` · `POST /api/admin/tickets` | admin | novo administrador · ticket de suporte |

Recursos: `services`, `barbers`, `clients`, `appts`, `sales`, `reviews`, `notes`, `alerts`, `bills`.

## Limites conhecidos

- Os **gráficos e totais do Dashboard, Financeiro e Relatórios** ainda usam uma série simulada no front (`SER` em `js/data.js`); eles não são calculados a partir de agendamentos e vendas do banco.
- Senha mínima de 6 caracteres (mesma regra do formulário); aumente em `backend/server.js` (`checkAccount`) e no front se quiser.
- Sem envio de e-mail (recuperação de senha) e sem upload de imagens.
