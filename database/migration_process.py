"""
工艺模板表迁移脚本
修复 template_code 单列唯一约束为 (template_code, version) 复合唯一约束

使用方法:
    cd backend
    python ../database/migration_process.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))

from config import Config
from database.db import db
from flask import Flask
from sqlalchemy import inspect, text


def run_migration():
    app = Flask(__name__)
    config = Config()
    app.config['SQLALCHEMY_DATABASE_URI'] = config.DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    with app.app_context():
        db_type = config.DB_TYPE
        print(f"数据库类型: {db_type}")
        print(f"数据库URI: {config.DATABASE_URI}")
        print("-" * 50)

        inspector = inspect(db.engine)
        table_names = inspector.get_table_names()

        if 'process_template' not in table_names:
            print("process_template 表不存在，无需迁移（db.create_all() 会自动创建正确结构）")
            return

        print("process_template 表已存在，检查唯一约束...")

        if db_type == 'sqlite':
            run_sqlite_migration(db)
        elif db_type == 'mysql':
            run_mysql_migration(db)
        else:
            print(f"不支持的数据库类型: {db_type}，请手动修改唯一约束")
            return

        print("\n迁移完成！")


def run_sqlite_migration(db):
    """SQLite 迁移"""
    try:
        result = db.session.execute(text(
            "SELECT name, sql FROM sqlite_master "
            "WHERE type='index' AND tbl_name='process_template'"
        ))
        indexes = result.fetchall()
        print(f"当前索引: {[idx[0] for idx in indexes]}")

        for idx_name, idx_sql in indexes:
            if idx_name.startswith('sqlite_autoindex_process_template') and idx_sql is None:
                print(f"  删除自动唯一索引: {idx_name}")
                db.session.execute(text(f"DROP INDEX IF EXISTS {idx_name}"))

        print("  创建复合唯一索引 uk_template_code_version")
        db.session.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uk_template_code_version "
            "ON process_template(template_code, version)"
        ))
        db.session.commit()
        print("SQLite 迁移成功")
    except Exception as e:
        db.session.rollback()
        print(f"SQLite 迁移出错: {e}")


def run_mysql_migration(db):
    """MySQL 迁移"""
    try:
        result = db.session.execute(text(
            "SELECT DISTINCT index_name FROM information_schema.statistics "
            "WHERE table_name = 'process_template' "
            "AND non_unique = 0 AND index_name != 'PRIMARY'"
        ))
        unique_indexes = [row[0] for row in result.fetchall()]
        print(f"当前唯一索引: {unique_indexes}")

        if 'template_code' in unique_indexes:
            print("  删除单列唯一索引: template_code")
            db.session.execute(text("ALTER TABLE process_template DROP INDEX template_code"))
        else:
            print("  未找到 template_code 单列唯一索引，跳过")

        if 'uk_template_code_version' not in unique_indexes:
            print("  创建复合唯一索引: uk_template_code_version")
            db.session.execute(text(
                "ALTER TABLE process_template "
                "ADD UNIQUE INDEX uk_template_code_version (template_code, version)"
            ))
        else:
            print("  复合唯一索引已存在，跳过")

        db.session.commit()
        print("MySQL 迁移成功")
    except Exception as e:
        db.session.rollback()
        print(f"MySQL 迁移出错: {e}")


if __name__ == '__main__':
    run_migration()
