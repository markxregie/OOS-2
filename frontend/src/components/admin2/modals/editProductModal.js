import React, { useState, useEffect } from "react";
import "./editProductModal.css";

function EditProductModal({ product, onClose, onUpdate }) {
    const [editedProduct, setEditedProduct] = useState({ ...product });

    useEffect(() => {
        setEditedProduct({ ...product });
    }, [product]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedProduct((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(editedProduct);
        onClose();
    };

    return (
        <div className="editProduct-modal-overlay">
            <div className="editProduct-modal">
                <h2>Edit Product</h2>
                <form onSubmit={handleSubmit}>
                    <label>
                        Name:
                        <input
                            type="text"
                            name="name"
                            value={editedProduct.name}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Description:
                        <textarea
                            name="description"
                            value={editedProduct.description}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Category:
                        <select
                            name="category"
                            value={editedProduct.category}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select a category</option>
                            <option value="Specialty Coffee">Specialty Coffee</option>
                            <option value="Milk-Based Coffee">Milk-Based Coffee</option>
                            <option value="Non-Coffee">Non-Coffee</option>
                            <option value="Snacks">Snacks</option>
                            <option value="Pastries">Pastries</option>
                            <option value="Meals">Meals</option>
                        </select>
                    </label>

                    <div className="editProduct-modal-buttons">
                        <button type="submit" className="editProduct-save-button">Save</button>
                        <button type="button" className="editProduct-cancel-button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditProductModal;