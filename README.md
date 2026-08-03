# TimeTracker - Sistema de Monitoramento de Funcionários

Aplicativo completo de rastreamento de tempo para equipes, com Web App, Desktop App e backend em FastAPI.

## Funcionalidades

- **Registro de tempo**: Iniciar, pausar, retomar e parar o timer de trabalho
- **Registro manual**: Adicionar entradas de tempo completas manualmente (data/hora início e fim)
- **Projetos**: Criar e gerenciar projetos com membros e cores personalizadas
- **Detalhes do projeto**: Página dedicada para gerenciar membros (adicionar/remover) e tarefas
- **Tarefas**: Organizar trabalho em tarefas com responsável, status, prioridade e filtros
- **Timesheet**: Histórico completo com filtros por projeto e data, edição, exclusão e exportação CSV
- **Relatórios**: Análise de horas por dia, projeto e usuário, com gráficos (barras e pizza) e exportação CSV
- **Dashboard**: Estatísticas de hoje, semana e mês com resumo por projeto e timer ao vivo
- **Gestão de usuários**: Página de administração para criar, ativar/desativar e definir papéis (admin, manager, employee)
- **Autenticação**: Sistema de login com JWT e controle de permissões por papel (RBAC)
- **Multi-plataforma**: Web App, Desktop App (Electron) e Mobile (PWA)

## Arquitetura

```
timetracker/
├── backend/          # API FastAPI (Python)
│   ├── app/
│   │   ├── api/      # Rotas: auth, users, projects, tasks, time-entries
│   │   ├── core/     # Config, segurança, dependências
│   │   ├── models/   # Modelos SQLAlchemy (User, Project, Task, TimeEntry)
│   │   ├── schemas/  # Schemas Pydantic
│   │   └── db/       # Sessão e conexão com banco
│   └── alembic/      # Migrações de banco
├── frontend/         # React + TypeScript + Vite + Tailwind
│   └── src/
│       ├── api/      # Client HTTP (Axios)
│       ├── pages/    # Dashboard, Projetos, Tarefas, Timesheet, Relatórios
│       └── components/ # Componentes de UI e Layout
├── desktop/          # Electron Desktop App
└── docker-compose.yml
```

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic |
| Banco | PostgreSQL 16 (asyncpg) |
| Cache | Redis |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Charts | Recharts |
| Desktop | Electron |
| Auth | JWT (python-jose), bcrypt |

## Como Executar

### Opção 1: Docker (recomendado)

```bash
docker-compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- API Docs (Swagger): http://localhost:8000/docs

### Opção 2: Desenvolvimento local

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env
# Inicie PostgreSQL e Redis
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Desktop:**
```bash
cd desktop
npm install
npm run dev
```

## API Endpoints

### Autenticação
- `POST /api/v1/auth/register` - Registrar usuário
- `POST /api/v1/auth/login` - Login (retorna JWT)
- `GET /api/v1/auth/me` - Usuário atual

### Usuários
- `GET /api/v1/users` - Listar (manager/admin)
- `PUT /api/v1/users/{id}` - Atualizar
- `DELETE /api/v1/users/{id}` - Desativar

### Projetos
- `GET/POST /api/v1/projects` - Listar/Criar
- `GET/PUT/DELETE /api/v1/projects/{id}` - Gerenciar
- `POST /api/v1/projects/{id}/members` - Adicionar membro

### Tarefas
- `GET/POST /api/v1/tasks` - Listar/Criar
- `GET/PUT/DELETE /api/v1/tasks/{id}` - Gerenciar

### Registros de tempo
- `POST /api/v1/time-entries/start` - Iniciar timer
- `POST /api/v1/time-entries/{id}/stop` - Parar timer
- `POST /api/v1/time-entries/{id}/pause` - Pausar
- `POST /api/v1/time-entries/{id}/resume` - Retomar
- `GET /api/v1/time-entries/dashboard/stats` - Dashboard
- `POST /api/v1/time-entries/reports` - Gerar relatório

## Estrutura do Banco

- **users**: Funcionários com papéis (admin/manager/employee)
- **projects**: Projetos com proprietário e membros
- **project_members**: Relação N:N usuários-projetos
- **tasks**: Tarefas dentro de projetos
- **time_entries**: Registros de tempo (início, fim, duração, status)

## Empacotar Desktop App

```bash
cd desktop
npm install
npm run dist:win   # Windows (NSIS + portable)
npm run dist:mac   # macOS (DMG)
npm run dist:linux # Linux (AppImage + deb)
```

## Segurança

- Senhas com hash bcrypt
- JWT com expiração (7 dias por padrão)
- Controle de acesso por papel (RBAC)
- CORS configurado para origem do frontend
- Acesso a dados restrito: employees só veem seus próprios registros
