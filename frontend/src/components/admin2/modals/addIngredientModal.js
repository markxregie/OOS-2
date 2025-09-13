import React, { useState } from "react";
import "./addIngredientModal.css";

function AddIngredientModal({ onClose }) {
    const [ingredientName, setIngredientName] = useState("");
    const [amount, setAmount] = useState("");
    const [measurement, setMeasurement] = useState("");
    const [batchDate, setBatchDate] = useState("");
    const [expirationDate, setExpirationDate] = useState("");
    const [status, setStatus] = useState("");

    const [errors, setErrors] = useState({
        ingredientName: "",
        amount: "",
        measurement: "",
        batchDate: "",
        expirationDate: "",
        status: ""
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!ingredientName) newErrors.ingredientName = "This field is required";
        if (!amount) newErrors.amount = "This field is required";
        if (!measurement) newErrors.measurement = "This field is required";
        if (!batchDate) newErrors.batchDate = "This field is required";
        if (!expirationDate) newErrors.expirationDate = "This field is required";
        if (!status) newErrors.status = "This field is required";

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            console.log("Ingredient submitted:", {
                ingredientName,
                amount,
                measurement,
                batchDate,
                expirationDate,
                status
            });
            onClose();
        }
    };

    const handleFocus = (field) => {
        setErrors((prevErrors) => ({
            ...prevErrors,
            [field]: ""
        }));
    };

    return (
        <div className="addIngredient-modal-overlay">
            <div className="addIngredient-modal-container">
                <div className="addIngredient-modal-header">
                    <h3>Add Ingredient</h3>
                    <span className="addIngredient-close-button" onClick={onClose}>&times;</span>
                </div>
                <form className="addIngredient-modal-form" onSubmit={handleSubmit}>
                    <label>
                        Ingredient Name <span className="addIngredient-required-asterisk">*</span>
                        <input
                            type="text"
                            value={ingredientName}
                            onChange={(e) => setIngredientName(e.target.value)}
                            onFocus={() => handleFocus('ingredientName')}
                            className={errors.ingredientName ? "addIngredient-error" : ""}
                        />
                        {errors.ingredientName && <p className="addIngredient-error-message">{errors.ingredientName}</p>}
                    </label>

                    <div className="addIngredient-row">
                        <label className="addIngredient-half">
                            Amount <span className="addIngredient-required-asterisk">*</span>
                            <input
                                type="text"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                onFocus={() => handleFocus('amount')}
                                className={errors.amount ? "addIngredient-error" : ""}
                            />
                            {errors.amount && <p className="addIngredient-error-message">{errors.amount}</p>}
                        </label>

                        <label className="addIngredient-half">
                            Measurement <span className="addIngredient-required-asterisk">*</span>
                            <input
                                type="text"
                                value={measurement}
                                onChange={(e) => setMeasurement(e.target.value)}
                                onFocus={() => handleFocus('measurement')}
                                className={errors.measurement ? "addIngredient-error" : ""}
                            />
                            {errors.measurement && <p className="addIngredient-error-message">{errors.measurement}</p>}
                        </label>
                    </div>

                    <div className="addIngredient-row">
                        <label className="addIngredient-half">
                            Batch Date <span className="addIngredient-required-asterisk">*</span>
                            <input
                                type="date"
                                value={batchDate}
                                onChange={(e) => setBatchDate(e.target.value)}
                                onFocus={() => handleFocus('batchDate')}
                                className={errors.batchDate ? "addIngredient-error" : ""}
                            />
                            {errors.batchDate && <p className="addIngredient-error-message">{errors.batchDate}</p>}
                        </label>

                        <label className="addIngredient-half">
                            Expiration Date <span className="addIngredient-required-asterisk">*</span>
                            <input
                                type="date"
                                value={expirationDate}
                                onChange={(e) => setExpirationDate(e.target.value)}
                                onFocus={() => handleFocus('expirationDate')}
                                className={errors.expirationDate ? "addIngredient-error" : ""}
                            />
                            {errors.expirationDate && <p className="addIngredient-error-message">{errors.expirationDate}</p>}
                        </label>
                    </div>

                    <label>
                        Status <span className="addIngredient-required-asterisk">*</span>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            onFocus={() => handleFocus('status')}
                            className={errors.status ? "addIngredient-error" : ""}
                        >
                            <option value="">Select status</option>
                            <option value="Available">Available</option>
                            <option value="Low Stock">Low Stock</option>
                            <option value="Out of Stock">Out of Stock</option>
                        </select>
                        {errors.status && <p className="addIngredient-error-message">{errors.status}</p>}
                    </label>

                    <div className="addIngredient-button-container">
                        <button className="addIngredient-submit-button">Add Ingredient</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddIngredientModal;