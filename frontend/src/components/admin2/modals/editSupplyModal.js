import React, { useState, useEffect } from "react";
import "./editSupplyModal.css";

function EditSupplyModal({ supply, onClose, onUpdate }) {
    const [editedSupply, setEditedSupply] = useState({ ...supply });

    useEffect(() => {
        setEditedSupply({ ...supply });
    }, [supply]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedSupply((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(editedSupply);
        onClose();
    };

    return (
        <div className="editSupply-modal-overlay">
            <div className="editSupply-modal">
                <h2>Edit Supply</h2>
                <form onSubmit={handleSubmit}>
                    <label>
                        Name:
                        <input
                            type="text"
                            name="name"
                            value={editedSupply.name}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <div className="supply-group">
                        <div className="supply-quantity">
                            <label>
                                Quantity:
                                <input
                                    type="number"
                                    name="quantity"
                                    value={editedSupply.quantity}
                                    onChange={handleChange}
                                    required
                                />
                            </label>
                        </div>
                        <div className="supply-measurement">
                            <label>
                                Measurement:
                                <select
                                    name="measurement"
                                    value={editedSupply.measurement}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="Small">Small</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Large">Large</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <label>
                        Supply Date:
                        <input
                            type="date"
                            name="supplyDate"
                            value={editedSupply.supplyDate}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Status:
                        <select
                            name="status"
                            value={editedSupply.status}
                            onChange={handleChange}
                            required
                        >
                            <option value="Available">Available</option>
                            <option value="Low Stock">Low Stock</option>
                            <option value="Out of Stock">Out of Stock</option>
                        </select>
                    </label>

                    <div className="editSupply-modal-buttons">
                        <button type="submit" className="editSupply-save-button">Save</button>
                        <button type="button" className="editSupply-cancel-button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditSupplyModal;