from .database import SessionLocal
from .models import User
from .utils.auth import hash_password
from .config import Role

if __name__ == "__main__":
    db = SessionLocal()

    # Check if admin exists
    admin = db.query(User).filter(User.email == "admin@temple.com").first()
    if not admin:
        admin = User(
            name="Admin User",
            email="admin@temple.com",
            hashed_password=hash_password("admin123"),
            role=Role.ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print("✅ Admin user created!")
        print("Email: admin@temple.com")
        print("Password: admin123")
    else:
        print("⚠️ Admin user already exists")

    db.close()
