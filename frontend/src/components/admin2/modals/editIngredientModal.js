import React, { useState, useEffect } from "react";
import "./editIngredientModal.css";

function EditIngredientModal({ ingredient, onClose, onUpdate }) {
    const [editedIngredient, setEditedIngredient] = useState({ ...ingredient });

    useEffect(() => {
        setEditedIngredient({ ...ingredient });
    }, [ingredient]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedIngredient((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(editedIngredient);
        onClose();
    };

    return (
        <div className="editIngredient-modal-overlay">
            <div className="editIngredient-modal">
                <h2>Edit Ingredient</h2>
                <form onSubmit={handleSubmit}>
                    <label>
                        Name:
                        <input
                            type="text"
                            name="name"
                            value={editedIngredient.name}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <div className="ingredient-group">
                        <div className="ingredient-amount">
                            <label>
                                Amount:
                                <input
                                    type="number"
                                    name="amount"
                                    value={editedIngredient.amount}
                                    onChange={handleChange}
                                    required
                                />
                            </label>
                        </div>
                        <div className="ingredient-measurement">
                            <label>
                                Measurement:
                                <select
                                    name="measurement"
                                    value={editedIngredient.measurement}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                    <option value="lbs">lbs</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <div className="ingredient-group">
                        <div className="ingredient-bestBefore">
                            <label>
                                Best Before Date:
                                <input
                                    type="date"
                                    name="bestBefore"
                                    value={editedIngredient.bestBefore}
                                    onChange={handleChange}
                                    required
                                />
                            </label>
                        </div>
                        <div className="ingredient-expiration">
                            <label>
                                Expiration Date:
                                <input
                                    type="date"
                                    name="expiration"
                                    value={editedIngredient.expiration}
                                    onChange={handleChange}
                                    required
                                />
                            </label>
                        </div>
                    </div>

                    <label>
                        Status:
                        <select
                            name="status"
                            value={editedIngredient.status}
                            onChange={handleChange}
                            required
                        >
                            <option value="Available">Available</option>
                            <option value="Low Stock">Low Stock</option>
                            <option value="Out of Stock">Out of Stock</option>
                        </select>
                    </label>

                    <div className="editIngredient-modal-buttons">
                        <button type="submit" className="editIngredient-save-button">Save</button>
                        <button type="button" className="editIngredient-cancel-button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditIngredientModal;