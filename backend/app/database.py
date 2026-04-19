from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Geliştirme aşaması için hafif ve kurulum gerektirmeyen SQLite kullanıyoruz.
# Canlı (Production) ortamında bu URL postgresql://user:password@host/dbname olarak değiştirilecek.
SQLALCHEMY_DATABASE_URL = "sqlite:///./interview_app.db"

# engine, veritabanı ile konuşan ana motordur. check_same_thread=False SQLite'a özeldir.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Her bir veritabanı işlemi için kullanılacak olan oturum (session) oluşturucu
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Tüm modellerimizin miras alacağı temel (Base) sınıf
Base = declarative_base()

# FastAPI bağımlılığı (Dependency) olarak kullanılacak
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
