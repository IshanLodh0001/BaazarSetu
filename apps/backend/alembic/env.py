"""
Alembic env.py — auto-generates migrations from SQLAlchemy models.
"""
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

load_dotenv()

# Import all models so Alembic sees them
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import Base
import app.models  # noqa: F401 — registers all models with Base.metadata

config = context.config

# Override sqlalchemy.url from env var
sync_url = os.environ.get("SYNC_DATABASE_URL", "postgresql://baazarsetu:baazarsetu_pass@localhost:5432/baazarsetu_db")
config.set_main_option("sqlalchemy.url", sync_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
