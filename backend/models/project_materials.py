from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class ProjectMaterial(Base):
    __tablename__ = "project_materials"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    stone_block_id = Column(Integer, ForeignKey("stone_blocks.id"), nullable=True)
    required_qty = Column(Float, nullable=False)

    project = relationship("Project", back_populates="materials")
    serials = relationship("ProjectMaterialSerial", back_populates="material", cascade="all, delete-orphan")


class ProjectMaterialSerial(Base):
    __tablename__ = "project_material_serials"
    id = Column(Integer, primary_key=True, index=True)
    project_material_id = Column(Integer, ForeignKey("project_materials.id"), nullable=False)
    item_serial_id = Column(Integer, ForeignKey("item_serials.id"), nullable=False)

    material = relationship("ProjectMaterial", back_populates="serials")
