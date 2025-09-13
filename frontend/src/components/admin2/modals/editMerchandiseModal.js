import React, { useState, useEffect } from "react";
import "./editMerchandiseModal.css";

function EditMerchandiseModal({ merchandise, onClose, onUpdate }) {
    const [editedMerchandise, setEditedMerchandise] = useState({ ...merchandise });

    useEffect(() => {
        setEditedMerchandise({ ...merchandise });
    }, [merchandise]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedMerchandise((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(editedMerchandise);
        onClose();
    };

    return (
        <div className="editMerchandise-modal-overlay">
            <div className="editMerchandise-modal">
                <h2>Edit Merchandise</h2>
                <form onSubmit={handleSubmit}>
                    <label>
                        Name:
                        <input
                            type="text"
                            name="name"
                            value={editedMerchandise.name}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Quantity:
                        <input
                            type="number"
                            name="quantity"
                            value={editedMerchandise.quantity}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Date Added:
                        <input
                            type="date"
                            name="dateAdded"
                            value={editedMerchandise.dateAdded}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Status:
                        <select
                            name="status"
                            value={editedMerchandise.status}
                            onChange={handleChange}
                            required
                        >
                            <option value="Available">Available</option>
                            <option value="Low Stock">Low Stock</option>
                            <option value="Out of Stock">Out of Stock</option>
                        </select>
                    </label>

                    <div className="editMerchandise-modal-buttons">
                        <button type="submit" className="editMerchandise-save-button">Save</button>
                        <button type="button" className="editMerchandise-cancel-button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditMerchandiseModal;
