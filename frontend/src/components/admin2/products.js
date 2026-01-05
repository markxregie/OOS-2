
import React, { useState, useContext } from "react";
import "../admin2/products.css"; // Renamed CSS file for clarity
import { FaChevronDown, FaBell, FaFolderOpen, FaEdit, FaArchive } from "react-icons/fa";
import DataTable from "react-data-table-component";
import ProductTypeModal from './modals/productTypeModal';
import AddProductModal from './modals/addProductModal';
import EditProductModal from './modals/editProductModal';
import ViewProductModal from './modals/viewProductModal';
import { AuthContext } from "../AuthContext";

function Products() {
    const { logout } = useContext(AuthContext);
    const userRole = "Admin";
    const userName = "Lim Alcovendas";

    const currentDate = new Date().toLocaleString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric",
    });

    const [activeTab, setActiveTab] = useState("product-drinks");
    const [isDropdownOpen, setDropdownOpen] = useState(false);

    const [drinks, setDrinks] = useState([
        { 
            id: 1, 
            name: "Americano", 
            description: "Matapang na Kape", 
            category: "Specialty Coffee" 
        },
    ]);

    const [foods, setFoods] = useState([
        { 
            id: 1, 
            name: "Tacos", 
            description: "Masarap itu", 
            category: "Snacks" 
        },
    ]);

    const handleView = (product) => {
        setViewedProduct(product);
    };

    const handleEdit = (product) => {
        setEditModalData(product);
    };

    const handleUpdateProduct = (updatedProduct) => {
        if (activeTab === "product-drinks") {
            setDrinks((prev) =>
                prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
            );
        } else {
            setFoods((prev) =>
                prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
            );
        }
    };

    const handleDelete = (productId, type) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this product?");
        if (confirmDelete) {
            if (type === "Drink") {
                setDrinks((prev) => prev.filter((p) => p.id !== productId));
            } else {
                setFoods((prev) => prev.filter((p) => p.id !== productId));
            }
        }
    };

    const columns = (type) => [
        { name: "PRODUCT NAME", selector: (row) => row.name, sortable: true, width: "25%" },
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

    const [showProductTypeModal, setShowProductTypeModal] = useState(false);
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [editModalData, setEditModalData] = useState(null);
    const [viewedProduct, setViewedProduct] = useState(null);

    const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

    const handleLogout = () => {
        try { logout(); } catch {}
        window.location.replace("http://localhost:4002/");
    };

    return (
        <div className="products">
            
            <div className="roles">
                <header className="header">
                    <div className="header-left">
                        <h2 className="page-title">Products</h2>
                    </div>
                    <div className="header-right">
                        <div className="header-date">{currentDate}</div>
                        <div className="header-profile">
                            <div className="profile-pic"></div>
                            <div className="profile-info">
                                <div className="profile-role">Hi! I'm {userRole}</div>
                                <div className="profile-name">{userName}</div>
                            </div>
                            <div className="dropdown-icon" onClick={toggleDropdown}><FaChevronDown /></div>
                            <div className="bell-icon"><FaBell className="bell-outline" /></div>
                            {isDropdownOpen && (
                                <div className="profile-dropdown">
                                    <ul>
                                        <li>Edit Profile</li>
                                        <li onClick={handleLogout} style={{ cursor: "pointer" }}>Logout</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="product-header">
                    <div className="product-top-row">
                        <button
                            className={`product-tab-button ${activeTab === "product-drinks" ? "active" : ""}`}
                            onClick={() => setActiveTab("product-drinks")}
                        >
                            Drinks
                        </button>
                        <button
                            className={`product-tab-button ${activeTab === "product-foods" ? "active" : ""}`}
                            onClick={() => setActiveTab("product-foods")}
                        >
                            Foods
                        </button>
                    </div>
                    <div className="product-bottom-row">
                        <input
                            type="text"
                            className="product-search-box"
                            placeholder="Search products..."
                        />
                        <div className="filter-product-container">
                            <label htmlFor="filter-product">Filter by Categories:</label>
                            <select id="filter-product" className="filter-product-select">
                                <option value="all">All</option>
                                <option value="Categories">Categories</option>
                            </select>
                        </div>

                        <div className="sort-product-container">
                            <label htmlFor="sort-product">Sort by:</label>
                            <select id="sort-product" className="sort-product-select">
                                <option value="nameAsc">Ascending</option>
                                <option value="nameDesc">Descending</option>
                            </select>
                        </div>
                        
                        <button
                            className="add-product-button"
                            onClick={() => setShowAddProductModal(true)}
                        >
                            + Add Product
                        </button>

                        <button
                            className={`product-type-button ${activeTab === "product-type" ? "active" : ""}`}
                            onClick={() => {
                                setActiveTab("product-type");
                                setShowProductTypeModal(true);
                            }}
                        >
                            Product Type
                        </button>
                    </div>
                </div>

                <div className="products-content">
                    <DataTable
                        columns={columns(activeTab === "product-drinks" ? "Drink" : "Food")}
                        data={activeTab === "product-drinks" ? drinks : foods}
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
                                },
                            },
                        }}
                    />
                </div>
            </div>

            {viewedProduct && (
                <ViewProductModal
                    product={viewedProduct}
                    onClose={() => setViewedProduct(null)}
                    onEdit={handleEdit}
                    onDelete={(id) => {
                        handleDelete(id, activeTab === "product-drinks" ? "Drink" : "Food");
                        setViewedProduct(null);
                    }}
                />
            )}

            {showProductTypeModal && (
                <ProductTypeModal onClose={() => setShowProductTypeModal(false)} />
            )}

            {showAddProductModal && (
                <AddProductModal
                    onClose={() => setShowAddProductModal(false)}
                    onSubmit={(newProduct) => {
                        if (newProduct.type === "Drink") {
                            setDrinks([...drinks, { ...newProduct, id: Date.now() }]);
                        } else {
                            setFoods([...foods, { ...newProduct, id: Date.now() }]);
                        }
                    }}
                />
            )}

            {editModalData && (
                <EditProductModal
                    product={editModalData}
                    onClose={() => setEditModalData(null)}
                    onUpdate={handleUpdateProduct}
                />
            )}
        </div>
    );
}

export default Products;
