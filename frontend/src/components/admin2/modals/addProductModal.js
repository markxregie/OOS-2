import React, { useState } from "react";
import "./addProductModal.css"; // Make sure the CSS file is saved as this

function AddProductModal({ onClose, onSubmit }) {
    const [productType, setProductType] = useState(""); // New state for Product Type
    const [productName, setProductName] = useState("");
    const [productCategory, setProductCategory] = useState("");
    const [productDescription, setProductDescription] = useState("");

    const [errors, setErrors] = useState({
        productType: "",
        productName: "",
        productCategory: "",
        productDescription: ""
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!productType) newErrors.productType = "This field is required";
        if (!productName) newErrors.productName = "This field is required";
        if (!productCategory) newErrors.productCategory = "This field is required";
        if (!productDescription) newErrors.productDescription = "This field is required";

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            const newProduct = {
                type: productType, // Add this field for clarity
                name: productName,
                description: productDescription,
                category: productCategory
            };

            // 👇 Call the onSubmit function passed from Products
            onSubmit(newProduct);

            onClose();
        }
    };

    const handleFocus = (field) => {
        setErrors((prevErrors) => ({
            ...prevErrors,
            [field]: "",
        }));
    };

    return (
        <div className="addProduct-modal-overlay">
            <div className="addProduct-modal-container">
                <div className="addProduct-modal-header">
                    <h3>Add Product</h3>
                    <span className="addProduct-close-button" onClick={onClose}>&times;</span>
                </div>
                <form className="addProduct-modal-form" onSubmit={handleSubmit}>
                    <label>
                        Product Type <span className="addProduct-required-asterisk">*</span>
                        <select
                            value={productType}
                            onChange={(e) => setProductType(e.target.value)}
                            onFocus={() => handleFocus('productType')}
                            className={errors.productType ? "addProduct-error" : ""}
                        >
                            <option value="">Select a product type</option>
                            <option value="Drink">Drinks</option>
                            <option value="Food">Foods</option>
                        </select>
                        {errors.productType && <p className="addProduct-error-message">{errors.productType}</p>}
                    </label>

                    <label>
                        Product Name <span className="addProduct-required-asterisk">*</span>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            onFocus={() => handleFocus('productName')}
                            className={errors.productName ? "addProduct-error" : ""}
                        />
                        {errors.productName && <p className="addProduct-error-message">{errors.productName}</p>}
                    </label>

                    <label>
                        Category <span className="addProduct-required-asterisk">*</span>
                        <select
                            value={productCategory}
                            onChange={(e) => setProductCategory(e.target.value)}
                            onFocus={() => handleFocus('productCategory')}
                            className={errors.productCategory ? "addProduct-error" : ""}
                        >
                            <option value="">Select a category</option>
                            <option value="Specialty Coffee">Specialty Coffee</option>
                            <option value="Iced Beverages">Iced Beverages</option>
                            <option value="Smoothies">Smoothies</option>
                            <option value="Pastries">Pastries</option>
                        </select>
                        {errors.productCategory && <p className="addProduct-error-message">{errors.productCategory}</p>}
                    </label>

                    <label>
                        Description <span className="addProduct-required-asterisk">*</span>
                        <textarea
                            value={productDescription}
                            onChange={(e) => setProductDescription(e.target.value)}
                            onFocus={() => handleFocus('productDescription')}
                            className={errors.productDescription ? "addProduct-error" : ""}
                        />
                        {errors.productDescription && <p className="addProduct-error-message">{errors.productDescription}</p>}
                    </label>

                    <div className="addProduct-button-container">
                        <button className="addProduct-submit-button">Add Product</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddProductModal;