import React, { useState } from "react";
import "../admin/merchandise.css"; // Updated CSS file
import Sidebar from "../sidebar";
import { FaChevronDown, FaBell, FaFolderOpen, FaEdit, FaArchive } from "react-icons/fa";
import DataTable from "react-data-table-component";
import AddMerchandiseModal from './modals/addMerchandiseModal';
import EditMerchandiseModal from "./modals/editMerchandiseModal";
import ViewMerchandiseModal from "./modals/viewMerchandiseModal";


function Merchandise() { // Renamed component
    const userRole = "Admin";
    const userName = "Lim Alcovendas";

    const currentDate = new Date().toLocaleString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric",
    });

    const [merchandise, setMerchandise] = useState([ // Renamed state
        {
            id: 1,
            name: "Tumbler",
            quantity: "50",
            dateAdded: "2025-05-01",
            status: "Available",
        },
    ]);

    const [showAddMerchandiseModal, setShowAddMerchandiseModal] = useState(false);
    const [showEditMerchandiseModal, setShowEditMerchandiseModal] = useState(false);
    const [selectedMerchandise, setSelectedMerchandise] = useState(null);
    const [showViewMerchandiseModal, setShowViewMerchandiseModal] = useState(false);


    const handleView = (merch) => {
        setSelectedMerchandise(merch);
        setShowViewMerchandiseModal(true);
    };

    const handleEdit = (Merchandise) => {
        setSelectedMerchandise(Merchandise);
        setShowEditMerchandiseModal(true);
    };

    const handleUpdateMerchandise = (updatedMerchandise) => {
        setMerchandise(prev => prev.map(s => s.id === updatedMerchandise.id ? updatedMerchandise : s));
    };

    const handleDelete = (itemId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this merchandise?");
        if (confirmDelete) {
            setMerchandise((prev) => prev.filter((m) => m.id !== itemId));
        }
    };

    const columns = [
        { name: "NO.", selector: (row, index) => index + 1, width: "5%" },
        { name: "NAME", selector: (row) => row.name, sortable: true, width: "30%" },
        { name: "QUANTITY", selector: (row) => row.quantity, width: "10%", center: true },
        { name: "DATE ADDED", selector: (row) => row.dateAdded, width: "20%", center: true },
        { name: "STATUS", selector: (row) => row.status, width: "15%", center: true },
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
            width: "20%",
            center: true
        },
    ];

    return (
        <div className="merchandise">
            <Sidebar />
            <div className="roles">
                <header className="header">
                    <div className="header-left">
                        <h2 className="page-title">Merchandise</h2>
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

                <div className="merch-header">
                    <div className="merch-bottom-row">
                        <input
                            type="text"
                            className="merch-search-box"
                            placeholder="Search merchandise..."
                        />
                        <div className="filter-merch-container">
                            <label htmlFor="filter-merch">Filter by Status: </label>
                            <select id="filter-merch" className="filter-merch-select">
                                <option value="all">All</option>
                                <option value="Available">Available</option>
                                <option value="Low Stock">Low Stock</option>
                                <option value="Out of Stock">Out of Stock</option>
                            </select>
                        </div>

                        <div className="sort-merch-container">
                            <label htmlFor="sort-merch">Sort by:</label>
                            <select id="sort-merch" className="sort-merch-select">
                                <option value="nameAsc">Ascending</option>
                                <option value="nameDesc">Descending</option>
                            </select>
                        </div>

                        <button className="add-merch-button"
                            onClick={() => setShowAddMerchandiseModal(true)}
                        >
                        + Add Merchandise
                        </button>
                    </div>
                </div>

                <div className="merch-content">
                    <DataTable
                        columns={columns}
                        data={merchandise}
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

            {showViewMerchandiseModal && selectedMerchandise && (
                <ViewMerchandiseModal
                    merchandise={selectedMerchandise}
                    onClose={() => setShowViewMerchandiseModal(false)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            {showAddMerchandiseModal && (
                <AddMerchandiseModal onClose={() => setShowAddMerchandiseModal(false)} />
            )}

            {showEditMerchandiseModal && selectedMerchandise && (
                <EditMerchandiseModal
                    merchandise={selectedMerchandise}
                    onClose={() => setShowEditMerchandiseModal(false)}
                    onUpdate={handleUpdateMerchandise}
                />
            )}
        </div>
    );
}

export default Merchandise;
