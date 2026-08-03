import asyncio
from datetime import datetime, date, timedelta
from app.db.session import init_db, async_session_maker
from app.core.security import get_password_hash
from app.models import (
    User, UserRole, Project, ProjectMember, Task, TimeEntry, TimeEntryStatus,
)
from sqlalchemy import select


async def seed():
    await init_db()

    async with async_session_maker() as session:
        users = [
            {
                "email": "admin@timetracker.com",
                "password": "admin123",
                "full_name": "Administrador",
                "role": UserRole.ADMIN,
                "department": "Diretoria",
                "position": "Administrador do sistema",
                "hire_date": date(2022, 1, 10),
                "work_hours_per_day": 8,
            },
            {
                "email": "gestor@timetracker.com",
                "password": "gestor123",
                "full_name": "Maria Silva",
                "role": UserRole.MANAGER,
                "department": "Gestão de Projetos",
                "position": "Gestora de projetos",
                "hire_date": date(2022, 3, 5),
                "work_hours_per_day": 8,
            },
            {
                "email": "funcionario@timetracker.com",
                "password": "func12345",
                "full_name": "João Santos",
                "role": UserRole.EMPLOYEE,
                "cpf": "123.456.789-00",
                "department": "Desenvolvimento",
                "position": "Desenvolvedor Pleno",
                "hire_date": date(2023, 2, 1),
                "work_hours_per_day": 8,
                "hourly_rate": 40,
            },
            {
                "email": "ana@timetracker.com",
                "password": "ana12345",
                "full_name": "Ana Souza",
                "role": UserRole.EMPLOYEE,
                "cpf": "987.654.321-00",
                "department": "Design",
                "position": "Designer de Produto",
                "hire_date": date(2023, 6, 15),
                "work_hours_per_day": 8,
                "hourly_rate": 35,
            },
        ]

        created_users = {}
        for u in users:
            result = await session.execute(select(User).where(User.email == u["email"]))
            existing = result.scalar_one_or_none()
            if existing:
                for k, v in u.items():
                    if k not in ("email", "password") and v is not None:
                        setattr(existing, k, v)
                created_users[u["email"]] = existing
                print(f"[skip] Usuário já existe: {u['email']} (campos RH atualizados)")
                continue
            user = User(
                email=u["email"],
                full_name=u["full_name"],
                role=u["role"],
                hashed_password=get_password_hash(u["password"]),
                **{k: v for k, v in u.items() if k not in ("email", "password", "full_name", "role")},
            )
            session.add(user)
            await session.flush()
            created_users[u["email"]] = user
            print(f"[ok] Usuário criado: {u['email']} / {u['password']}")

        result = await session.execute(select(Project).where(Project.name == "Projeto Alpha"))
        project = result.scalar_one_or_none()
        if not project:
            admin = created_users["admin@timetracker.com"]
            project = Project(
                name="Projeto Alpha",
                description="Projeto de demonstração",
                color="#3B82F6",
                owner_id=admin.id,
            )
            session.add(project)
            await session.flush()

            members = [
                (created_users["gestor@timetracker.com"], "admin"),
                (created_users["funcionario@timetracker.com"], "member"),
                (created_users["ana@timetracker.com"], "member"),
            ]
            for user, role in members:
                session.add(ProjectMember(project_id=project.id, user_id=user.id, role=role))
            print("[ok] Projeto Alpha criado com membros")
        else:
            print("[skip] Projeto Alpha já existe")

        await session.flush()

        task_result = await session.execute(select(Task).where(Task.project_id == project.id))
        tasks = task_result.scalars().all()
        if not tasks:
            tasks = [
                Task(
                    title="Implementar autenticação",
                    description="Tela de login e JWT",
                    status="done",
                    priority=1,
                    project_id=project.id,
                    assignee_id=created_users["funcionario@timetracker.com"].id,
                ),
                Task(
                    title="Redesign do dashboard",
                    description="Novo layout com gráficos",
                    status="in_progress",
                    priority=2,
                    project_id=project.id,
                    assignee_id=created_users["ana@timetracker.com"].id,
                ),
            ]
            session.add_all(tasks)
            await session.flush()
            print("[ok] Tarefas de demonstração criadas")
        else:
            print("[skip] Tarefas já existem")

        entry_result = await session.execute(select(TimeEntry).limit(1))
        if not entry_result.scalar_one_or_none():
            now = datetime.utcnow()
            today = now.date()
            employees = [
                created_users["funcionario@timetracker.com"],
                created_users["ana@timetracker.com"],
            ]
            sample_entries = []
            for emp in employees:
                for day_offset in range(10):
                    d = today - timedelta(days=day_offset)
                    if d.weekday() >= 5:
                        continue
                    start = datetime(d.year, d.month, d.day, 9, 0)
                    sample_entries.append(TimeEntry(
                        description="Trabalho no Projeto Alpha",
                        user_id=emp.id,
                        project_id=project.id,
                        start_time=start,
                        end_time=start + timedelta(hours=8),
                        duration_seconds=8 * 3600,
                        status=TimeEntryStatus.COMPLETED,
                    ))
            session.add_all(sample_entries)
            print("[ok] Registros de tempo de demonstração criados")
        else:
            print("[skip] Registros de tempo já existem")

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
    print("\nSeed concluído!")
