import React, { useState } from "react";
import "../admin/recipeManagement.css";
import Sidebar from "../sidebar";
import { FaChevronDown, FaBell, FaFolderOpen, FaEdit, FaArchive } from "react-icons/fa";
import DataTable from "react-data-table-component";

function RecipeManagement() {
    const userRole = "Admin";
    const userName = "Lim Alcovendas";

    const currentDate = new Date().toLocaleString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric",
    });

    // Tab state
    const [activeTab, setActiveTab] = useState("recipe-drinks");

    // Separate data for drinks and foods
    const [drinks, setDrinks] = useState([
        { 
            id: 1, 
            name: "Placeholder", 
            description: "Placeholder", 
            category: "Placeholder" 
        },
    ]);

    const [foods, setFoods] = useState([
        { 
            id: 1, 
            name: "Placeholder2", 
            description: "Placeholder2", 
            category: "Placeholder2" 
        },
    ]);

    const handleView = (product) => {
        console.log("Viewing", product);
    };

    const handleEdit = (product) => {
        console.log("Editing", product);
    };

    const handleDelete = (productId, type) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this product?");
        if (confirmDelete) {
            if (type === "recipe-Drinks") {
                setDrinks((prev) => prev.filter((p) => p.id !== productId));
            } else {
                setFoods((prev) => prev.filter((p) => p.id !== productId));
            }
        }
    };

    const columns = (type) => [
        { name: "RECIPE NAME", selector: (row) => row.name, sortable: true, width: "25%" },
        { name: "PRODUCT DESCRIPTION", selector: (row) => row.description, wrap: true, width: "35%" },
        { name: "PRODUCT CATEGORY", selector: (row) => row.category, wrap: true, width: "20%" },
        {
            name: "ACTION",
            cell: (row) => (
            <div className="action-buttons">
                <button className="action-button view" onClick={() => handleView(row)}><FaFolderOpen /></button>
                <button className="action-button edit" onClick={() => handleEdit(row)}><FaEdit /></button>
                <button className="action-button delete" onClick={() => handleDelete(row.id, type)}><FaArchive /></button>
            </div>
            ),
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
            width: "20%",
        },
    ];

    return (
        <div className="recipeManagement">
            <Sidebar />
            <div className="roles">
                <header className="header">
                    <div className="header-left">
                        <h2 className="page-title">Recipe Management</h2>
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

                <div className="recipeManagement-header">
                    <div className="recipe-top-row">
                        <button
                            className={`recipe-tab-button ${activeTab === "recipe-drinks" ? "active" : ""}`}
                            onClick={() => setActiveTab("recipe-drinks")}
                        >
                            Drinks
                        </button>
                        <button
                            className={`recipe-tab-button ${activeTab === "recipe-foods" ? "active" : ""}`}
                            onClick={() => setActiveTab("recipe-foods")}
                        >
                            Foods
                        </button>
                    </div>
                    <div className="recipe-bottom-row">
                        <input
                            type="text"
                            className="search-box"
                            placeholder="Search recipes..."
                        />
                        <div className="filter-container">
                            <label htmlFor="filter">Filter by:</label>
                            <select id="filter" className="filter-select">
                                <option value="all">All</option>
                                <option value="type">Categories</option>
                            </select>
                        </div>

                        <div className="sort-container">
                            <label htmlFor="sort">Sort by:</label>
                            <select id="sort" className="sort-select">
                                <option value="nameAsc">Name (A-Z)</option>
                                <option value="nameDesc">Name (Z-A)</option>
                                <option value="categoryAsc">Category (A-Z)</option>
                                <option value="categoryDesc">Category (Z-A)</option>
                            </select>
                        </div>
                        
                        <button className="add-recipe-button">+ Add Recipe</button>
                    </div>
                </div>

                <div className="recipeManagement-content">
                    <DataTable
                        columns={columns(activeTab === "recipe-drinks" ? "Drink" : "Food")}
                        data={activeTab === "recipe-drinks" ? drinks : foods}
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
                                    textAlign: "center",
                                    letterSpacing: "1px",
                                },
                            },
                            rows: {
                                style: {
                                    minHeight: "55px",
                                    padding: "5px",
                                },
                            },
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default RecipeManagement;