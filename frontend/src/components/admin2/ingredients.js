import React, { useState } from "react";
import "../admin/ingredients.css";
import Sidebar from "../sidebar";
import { FaChevronDown, FaBell, FaFolderOpen, FaEdit, FaArchive } from "react-icons/fa";
import DataTable from "react-data-table-component";
import AddIngredientModal from './modals/addIngredientModal';
import EditIngredientModal from './modals/editIngredientModal';
import ViewIngredientModal from './modals/viewIngredientModal';

function Ingredients() {
    const userRole = "Admin";
    const userName = "Lim Alcovendas";

    const currentDate = new Date().toLocaleString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric",
    });

    const [ingredients, setIngredients] = useState([
        {
            id: 1,
            name: "Flour",
            amount: "5",
            measurement: "kg",
            bestBefore: "2025-08-01",
            expiration: "2025-10-01",
            status: "Available",
        },
    ]);

    const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
    const [showEditIngredientModal, setShowEditIngredientModal] = useState(false);
    const [currentIngredient, setCurrentIngredient] = useState(null);
    const [showViewIngredientModal, setShowViewIngredientModal] = useState(false);


    const handleView = (ingredient) => {
        setCurrentIngredient(ingredient);
        setShowViewIngredientModal(true);
    };

    const handleEdit = (ingredient) => {
        setCurrentIngredient(ingredient);
        setShowEditIngredientModal(true);
    };

    const handleUpdate = (updatedIngredient) => {
        setIngredients((prev) =>
            prev.map((ingredient) =>
                ingredient.id === updatedIngredient.id ? updatedIngredient : ingredient
            )
        );
    };

    const handleDelete = (ingredientId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this ingredient?");
        if (confirmDelete) {
            setIngredients((prev) => prev.filter((i) => i.id !== ingredientId));
        }
    };

    const columns = [
        { name: "NO.", selector: (row, index) => index + 1, width: "5%" },
        { name: "INGREDIENT NAME", selector: (row) => row.name, sortable: true, width: "20%" },
        { name: "AMOUNT", selector: (row) => row.amount, width: "10%", center: true },
        { name: "MEASUREMENT", selector: (row) => row.measurement, width: "10%", center: true },
        { name: "BEST BEFORE DATE", selector: (row) => row.bestBefore, width: "15%", center: true },
        { name: "EXPIRATION DATE", selector: (row) => row.expiration, width: "15%", center: true },
        { name: "STATUS", selector: (row) => row.status, width: "10%", center: true },
        {
            name: "ACTION",
            cell: (row) => (
                <div className="action-buttons">
                    <button className="action-button view" onClick={() => handleView(row)}><FaFolderOpen /></button>
                    <button className="action-button edit" onClick={() => handleEdit(row)}><FaEdit /></button>
                    <button className="action-button delete" onClick={() => handleDelete(row.id)}><FaArchive /></button>
                </div>
            ),
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
            width: "15%",
            center: true,
        },
    ];

    return (
        <div className="ingredients">
            <Sidebar />
            <div className="roles">
                <header className="header">
                    <div className="header-left">
                        <h2 className="page-title">Ingredient</h2>
                    </div>
                    <div className="header-right">
                        <div className="header-date">{currentDate}</div>
                        <div className="header-profile">
                            <div className="profile-pic"></div>
                            <div className="profile-info">
                                <div className="profile-role">Hi! I'm {userRole}</div>
                                <div className="profile-name">{userName}</div>
                            </div>
                            <div className="dropdown-icon"><FaChevronDown /></div>
                            <div className="bell-icon"><FaBell className="bell-outline" /></div>
                        </div>
                    </div>
                </header>

                <div className="ingredient-header">
                    <div className="ingredient-bottom-row">
                        <input
                            type="text"
                            className="ingredient-search-box"
                            placeholder="Search ingredients..."
                        />
                        <div className="filter-ingredient-container">
                            <label htmlFor="filter-ingredient">Filter by Status:</label>
                            <select id="filter-ingredient" className="filter-ingredient-select">
                                <option value="all">All</option>
                                <option value="Available">Available</option>
                                <option value="Low Stock">Low Stock</option>
                                <option value="Out of Stock">Out of Stock</option>
                            </select>
                        </div>

                        <div className="sort-ingredient-container">
                            <label htmlFor="sort-ingredient">Sort by:</label>
                            <select id="sort-ingredient" className="sort-ingredient-select">
                                <option value="nameAsc">Ascending</option>
                                <option value="nameDesc">Descending</option>
                            </select>
                        </div>

                        <button
                            className="add-ingredient-button"
                            onClick={() => setShowAddIngredientModal(true)}
                        >
                            + Add Ingredient
                        </button>
                    </div>
                </div>

                <div className="ingredient-content">
                    <DataTable
                        columns={columns}
                        data={ingredients}
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
                                    letterSpacing: "1px",
                                },
                            },
                            rows: {
                                style: {
                                    minHeight: "55px",
                                },
                            },
                        }}
                    />
                </div>
            </div>

            {showViewIngredientModal && currentIngredient && (
                <ViewIngredientModal
                    ingredient={currentIngredient}
                    onClose={() => setShowViewIngredientModal(false)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            {showAddIngredientModal && (
                <AddIngredientModal onClose={() => setShowAddIngredientModal(false)} />
            )}

            {showEditIngredientModal && currentIngredient && (
                <EditIngredientModal
                    ingredient={currentIngredient}
                    onClose={() => setShowEditIngredientModal(false)}
                    onUpdate={handleUpdate}
                />
            )}

        </div>
    );
}

export default Ingredients;
