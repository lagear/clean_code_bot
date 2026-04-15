"""
User management module.

This module provides separated, single-responsibility components for
user persistence, email notifications, logging, and report generation,
following SOLID design principles.
"""

import json
import logging
import smtplib
import sqlite3
from abc import ABC, abstractmethod
from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Domain model
# ---------------------------------------------------------------------------

@dataclass
class User:
    """Represents an application user."""

    name: str
    email: str
    password: str
    role: str


# ---------------------------------------------------------------------------
# Abstractions (Interface Segregation + Dependency Inversion)
# ---------------------------------------------------------------------------

class UserRepository(ABC):
    """Abstract interface for user persistence."""

    @abstractmethod
    def save(self, user: User) -> int:
        """Persist a new user and return its generated ID."""

    @abstractmethod
    def find_by_id(self, user_id: int) -> User | None:
        """Retrieve a user by primary key, or None if not found."""

    @abstractmethod
    def find_all(self) -> list[User]:
        """Return all stored users."""

    @abstractmethod
    def delete(self, user_id: int) -> None:
        """Remove a user by primary key."""


class Notifier(ABC):
    """Abstract interface for user notifications."""

    @abstractmethod
    def send_welcome(self, user: User) -> None:
        """Send a welcome message to a newly created user."""


class ReportFormatter(ABC):
    """Abstract interface for report serialisation."""

    @abstractmethod
    def format(self, users: list[User]) -> str:
        """Serialise a list of users into the target format."""


# ---------------------------------------------------------------------------
# Concrete implementations
# ---------------------------------------------------------------------------

class SQLiteUserRepository(UserRepository):
    """SQLite-backed implementation of UserRepository."""

    def __init__(self, db_path: str = "app.db") -> None:
        """
        Initialise the repository with a SQLite database.

        Args:
            db_path: Filesystem path to the SQLite database file.
        """
        self._conn = sqlite3.connect(db_path)

    def save(self, user: User) -> int:
        cur = self._conn.cursor()
        cur.execute(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            (user.name, user.email, user.password, user.role),
        )
        self._conn.commit()
        return cur.lastrowid  # type: ignore[return-value]

    def find_by_id(self, user_id: int) -> User | None:
        cur = self._conn.cursor()
        cur.execute("SELECT name, email, password, role FROM users WHERE id = ?", (user_id,))
        row = cur.fetchone()
        return User(*row) if row else None

    def find_all(self) -> list[User]:
        cur = self._conn.cursor()
        cur.execute("SELECT name, email, password, role FROM users")
        return [User(*row) for row in cur.fetchall()]

    def delete(self, user_id: int) -> None:
        cur = self._conn.cursor()
        cur.execute("DELETE FROM users WHERE id = ?", (user_id,))
        self._conn.commit()


class SmtpNotifier(Notifier):
    """Email notifier using SMTP."""

    def __init__(
        self,
        host: str,
        port: int,
        sender: str,
        password: str,
    ) -> None:
        """
        Args:
            host: SMTP server hostname.
            port: SMTP server port (typically 587 for STARTTLS).
            sender: The From address used for outgoing emails.
            password: SMTP authentication password.
        """
        self._host = host
        self._port = port
        self._sender = sender
        self._password = password

    def send_welcome(self, user: User) -> None:
        """
        Send a welcome email to the given user.

        Failures are logged as warnings rather than raised, so that
        a transient SMTP issue does not abort user creation.
        """
        try:
            with smtplib.SMTP(self._host, self._port) as server:
                server.starttls()
                server.login(self._sender, self._password)
                server.sendmail(
                    self._sender,
                    user.email,
                    f"Subject: Welcome\n\nHi {user.name}!",
                )
        except smtplib.SMTPException:
            logging.warning("Failed to send welcome email to %s", user.email, exc_info=True)


class JsonReportFormatter(ReportFormatter):
    """Serialises user data as a JSON array."""

    def format(self, users: list[User]) -> str:
        return json.dumps([{"name": u.name, "email": u.email} for u in users], indent=2)


class CsvReportFormatter(ReportFormatter):
    """Serialises user data as CSV."""

    def format(self, users: list[User]) -> str:
        lines = ["name,email"] + [f"{u.name},{u.email}" for u in users]
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Input validation (Single Responsibility)
# ---------------------------------------------------------------------------

class UserValidator:
    """Validates user input before persistence."""

    def validate(self, user: User) -> None:
        """
        Raise ValueError if the user data is invalid.

        Args:
            user: The User instance to validate.

        Raises:
            ValueError: If name is empty or email is malformed.
        """
        if not user.name or not user.name.strip():
            raise ValueError("User name must not be empty.")
        if not user.email or "@" not in user.email:
            raise ValueError(f"Invalid email address: '{user.email}'.")


# ---------------------------------------------------------------------------
# Service layer (orchestration only — no I/O logic)
# ---------------------------------------------------------------------------

class UserService:
    """
    High-level service for user lifecycle management.

    Dependencies are injected, making the service easy to test and extend
    without modifying this class (Open/Closed Principle).
    """

    def __init__(
        self,
        repository: UserRepository,
        notifier: Notifier,
        validator: UserValidator,
    ) -> None:
        """
        Args:
            repository: Storage backend for users.
            notifier: Notification channel for new users.
            validator: Validator for user input.
        """
        self._repo = repository
        self._notifier = notifier
        self._validator = validator
        self._logger = logging.getLogger(self.__class__.__name__)

    def create_user(self, user: User) -> int:
        """
        Validate, persist, and notify for a new user.

        Args:
            user: The User to create.

        Returns:
            The generated database ID for the new user.

        Raises:
            ValueError: If the user data fails validation.
        """
        self._validator.validate(user)
        user_id = self._repo.save(user)
        self._notifier.send_welcome(user)
        self._logger.info("User created: %s (id=%d)", user.name, user_id)
        return user_id

    def get_user(self, user_id: int) -> User | None:
        """
        Retrieve a user by ID.

        Args:
            user_id: Primary key of the user to retrieve.

        Returns:
            The matching User, or None if not found.
        """
        return self._repo.find_by_id(user_id)

    def delete_user(self, user_id: int, requester_role: str) -> None:
        """
        Delete a user, restricted to admin callers.

        Args:
            user_id: Primary key of the user to delete.
            requester_role: Role of the caller; must be 'admin'.

        Raises:
            PermissionError: If the requester is not an admin.
        """
        if requester_role != "admin":
            raise PermissionError("Only admins may delete users.")
        self._repo.delete(user_id)
        self._logger.info("User deleted: id=%d by role=%s", user_id, requester_role)

    def generate_report(self, formatter: ReportFormatter) -> str:
        """
        Generate a user report in the format provided by the formatter.

        Args:
            formatter: A ReportFormatter implementation that determines
                       the output format (JSON, CSV, etc.).

        Returns:
            The serialised report as a string.
        """
        users = self._repo.find_all()
        return formatter.format(users)
