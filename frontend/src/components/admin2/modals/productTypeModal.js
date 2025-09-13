import React, { useState } from "react";
import "./productTypeModal.css";
import DataTable from "react-data-table-component";
import { FaEdit, FaArchive } from "react-icons/fa";

const ProductTypeModal = ({ onClose }) => {
    const [productTypes, setProductTypes] = useState([
        { id: 1, name: "Beverages" },
    ]);
    const [showAddFormModal, setShowAddFormModal] = useState(false);
    const [newTypeName, setNewTypeName] = useState("");

    const handleEdit = (type) => {
        console.log("Editing type", type);
    };

    const handleDelete = (typeId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this product type?");
        if (!confirmDelete) return;

        setProductTypes(prev => prev.filter(pt => pt.id !== typeId));
    };

    const handleAddType = () => {
        if (newTypeName.trim() === "") {
            alert("Product type name cannot be empty.");
            return;
        }

        const newType = {
            id: productTypes.length + 1,
            name: newTypeName.trim(),
        };

        setProductTypes([...productTypes, newType]);
        setNewTypeName("");
        setShowAddFormModal(false);
    };

    const columns = [
        { name: "No.", selector: (row, index) => index + 1, width: "10%" },
        { name: "Product Type Name", selector: (row) => row.name, sortable: true },
        {
            name: "Action",
            cell: (row) => (
                <div className="action-buttons">
                    <button className="action-button edit" onClick={() => handleEdit(row)}><FaEdit /></button>
                    <button className="action-button delete" onClick={() => handleDelete(row.id)}><FaArchive /></button>
                </div>
            ),
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
            width: "20%",
        },
    ];

    return (
        <div className="addProductType-modal-overlay">
            <div className="addProductType-modal-content">
                <div className="addProductType-modal-header">
                    <h2 className="addProductType-modal-title">Product Types</h2>
                    <button
                        className="add-product-type-button"
                        onClick={() => setShowAddFormModal(true)}
                    >
                        + Add Product Type
                    </button>
                </div>

                <DataTable
                    columns={columns}
                    data={productTypes}
                    striped
                    highlightOnHover
                    responsive
                    pagination
                    customStyles={{
                        headCells: {
                            style: {
                                backgroundColor: "#4B929D",
                                color: "#fff",
                                fontWeight: "600",
                                fontSize: "14px",
                                padding: "12px",
                                textTransform: "uppercase",
                            },
                        },
                        rows: {
                            style: {
                                minHeight: "55px",
                            },
                        },
                    }}
                />

                <button className="close-modal-button" onClick={onClose}>
                    Close
                </button>

                {showAddFormModal && (
                    <div className="nested-modal-overlay">
                        <div className="nested-modal-content">
                            <h3>Add New Product Type</h3>
                            <input
                                type="text"
                                placeholder="Enter product type name"
                                value={newTypeName}
                                onChange={(e) => setNewTypeName(e.target.value)}
                            />
                            <div className="modal-actions">
                                <button onClick={handleAddType} className="modal-add-button">Add</button>
                                <button onClick={() => setShowAddFormModal(false)} className="modal-close-button">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductTypeModal;