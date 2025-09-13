import React, { useState } from "react";
import "./addMerchandiseModal.css";

function AddMerchandiseModal({ onClose }) {
    const [merchName, setMerchName] = useState("");
    const [quantity, setQuantity] = useState("");
    const [dateAdded, setDateAdded] = useState("");
    const [status, setStatus] = useState("");

    const [errors, setErrors] = useState({
        merchName: "",
        quantity: "",
        dateAdded: "",
        status: ""
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!merchName) newErrors.merchName = "This field is required";
        if (!quantity) newErrors.quantity = "This field is required";
        if (!dateAdded) newErrors.dateAdded = "This field is required";
        if (!status) newErrors.status = "This field is required";

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            console.log("Merchandise submitted:", {
                merchName,
                quantity,
                dateAdded,
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
        <div className="addMerchandise-modal-overlay">
            <div className="addMerchandise-modal-container">
                <div className="addMerchandise-modal-header">
                    <h3>Add Merchandise</h3>
                    <span className="addMerchandise-close-button" onClick={onClose}>&times;</span>
                </div>
                <form className="addMerchandise-modal-form" onSubmit={handleSubmit}>
                    <label>
                        Merchandise Name <span className="addMerchandise-required-asterisk">*</span>
                        <input
                            type="text"
                            value={merchName}
                            onChange={(e) => setMerchName(e.target.value)}
                            onFocus={() => handleFocus('merchName')}
                            className={errors.merchName ? "addMerchandise-error" : ""}
                        />
                        {errors.merchName && <p className="addMerchandise-error-message">{errors.merchName}</p>}
                    </label>

                    <div className="addMerchandise-row">
                        <label className="addMerchandise-half">
                            Quantity <span className="addMerchandise-required-asterisk">*</span>
                            <input
                                type="text"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                onFocus={() => handleFocus('quantity')}
                                className={errors.quantity ? "addMerchandise-error" : ""}
                            />
                            {errors.quantity && <p className="addMerchandise-error-message">{errors.quantity}</p>}
                        </label>

                        <label className="addMerchandise-half">
                            Date Added <span className="addMerchandise-required-asterisk">*</span>
                            <input
                                type="date"
                                value={dateAdded}
                                onChange={(e) => setDateAdded(e.target.value)}
                                onFocus={() => handleFocus('dateAdded')}
                                className={errors.dateAdded ? "addMerchandise-error" : ""}
                            />
                            {errors.dateAdded && <p className="addMerchandise-error-message">{errors.dateAdded}</p>}
                        </label>
                    </div>

                    <label>
                        Status <span className="addMerchandise-required-asterisk">*</span>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            onFocus={() => handleFocus('status')}
                            className={errors.status ? "addMerchandise-error" : ""}
                        >
                            <option value="">Select status</option>
                            <option value="Available">Available</option>
                            <option value="Out of Stock">Out of Stock</option>
                            <option value="Discontinued">Discontinued</option>
                        </select>
                        {errors.status && <p className="addMerchandise-error-message">{errors.status}</p>}
                    </label>

                    <div className="addMerchandise-button-container">
                        <button className="addMerchandise-submit-button">Add Merchandise</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddMerchandiseModal;
