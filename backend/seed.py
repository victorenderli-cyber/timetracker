import asyncio
import sys
from app.db.session import init_db, async_session_maker
from app.core.security import get_password_hash
from app.models import User, UserRole, Project, ProjectMember
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
            },
            {
                "email": "gestor@timetracker.com",
                "password": "gestor123",
                "full_name": "Maria Silva",
                "role": UserRole.MANAGER,
            },
            {
                "email": "funcionario@timetracker.com",
                "password": "func12345",
                "full_name": "João Santos",
                "role": UserRole.EMPLOYEE,
            },
            {
                "email": "ana@timetracker.com",
                "password": "ana12345",
                "full_name": "Ana Souza",
                "role": UserRole.EMPLOYEE,
            },
        ]

        created_users = {}
        for u in users:
            result = await session.execute(select(User).where(User.email == u["email"]))
            existing = result.scalar_one_or_none()
            if existing:
                created_users[u["email"]] = existing
                print(f"[skip] Usuário já existe: {u['email']}")
                continue
            user = User(
                email=u["email"],
                full_name=u["full_name"],
                role=u["role"],
                hashed_password=get_password_hash(u["password"]),
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

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
    print("\nSeed concluído!")
