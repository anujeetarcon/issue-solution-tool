from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    issues = relationship("Issue", back_populates="category_rel")


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False, default="medium")  # low, medium, high
    symptoms = Column(Text, nullable=False)
    cause = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    category_rel = relationship("Category", back_populates="issues")
    solutions = relationship("Solution", back_populates="issue", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="issue", cascade="all, delete-orphan")


class Solution(Base):
    __tablename__ = "solutions"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)

    issue = relationship("Issue", back_populates="solutions")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    name = Column(String(50), nullable=False)

    issue = relationship("Issue", back_populates="tags")
