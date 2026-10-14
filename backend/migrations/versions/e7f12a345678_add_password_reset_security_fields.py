"""add_password_reset_security_fields

Revision ID: e7f12a345678
Revises: c303780df292
Create Date: 2026-10-13 18:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e7f12a345678'
down_revision: Union[str, Sequence[str], None] = 'c303780df292'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Safely add columns if not already added. On a fresh database the
    # table does not exist yet (the initial revision creates the schema
    # via the app's create_all), so there is nothing to alter.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'password_reset_codes' not in inspector.get_table_names():
        return
    columns = [col['name'] for col in inspector.get_columns('password_reset_codes')]

    if 'code_hash' not in columns:
        op.add_column('password_reset_codes', sa.Column('code_hash', sa.String(255), nullable=True))
        op.create_index(op.f('ix_password_reset_codes_code_hash'), 'password_reset_codes', ['code_hash'], unique=False)
    if 'reset_token_hash' not in columns:
        op.add_column('password_reset_codes', sa.Column('reset_token_hash', sa.String(255), nullable=True))
        op.create_index(op.f('ix_password_reset_codes_reset_token_hash'), 'password_reset_codes', ['reset_token_hash'], unique=False)
    if 'reset_token_expires_at' not in columns:
        op.add_column('password_reset_codes', sa.Column('reset_token_expires_at', sa.DateTime(), nullable=True))
    if 'attempts' not in columns:
        op.add_column('password_reset_codes', sa.Column('attempts', sa.Integer(), server_default='0', nullable=False))
    if 'max_attempts' not in columns:
        op.add_column('password_reset_codes', sa.Column('max_attempts', sa.Integer(), server_default='5', nullable=False))
    if 'last_requested_at' not in columns:
        op.add_column('password_reset_codes', sa.Column('last_requested_at', sa.DateTime(), nullable=True))

def downgrade() -> None:
    op.drop_column('password_reset_codes', 'last_requested_at')
    op.drop_column('password_reset_codes', 'max_attempts')
    op.drop_column('password_reset_codes', 'attempts')
    op.drop_column('password_reset_codes', 'reset_token_expires_at')
    op.drop_column('password_reset_codes', 'reset_token_hash')
    op.drop_column('password_reset_codes', 'code_hash')
