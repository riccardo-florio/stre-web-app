from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

# Initialize SQLAlchemy without app, will be bound in app factory

db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    first_name = db.Column(db.String(120), nullable=False)
    last_name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="normal")

    def set_password(self, password: str) -> None:
        """Hash and store the provided password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify a plaintext password against the stored hash."""
        return check_password_hash(self.password_hash, password)


class VideoProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    film_id = db.Column(db.String(100), nullable=False)
    progress = db.Column(db.Float, default=0.0, nullable=False)
    duration = db.Column(db.Float, default=0.0, nullable=False)
    slug = db.Column(db.String(255), nullable=True)
    title = db.Column(db.String(255), nullable=True)
    cover = db.Column(db.String(255), nullable=True)

    __table_args__ = (db.UniqueConstraint('user_id', 'film_id', name='uniq_user_film'),)
