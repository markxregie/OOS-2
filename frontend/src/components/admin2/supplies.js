import React, { useState } from "react";
import "../admin/supplies.css";
import Sidebar from "../sidebar";
import { FaChevronDown, FaBell, FaFolderOpen, FaEdit, FaArchive } from "react-icons/fa";
import DataTable from "react-data-table-component";
import AddSupplyModal from './modals/addSupplyModal';
import EditSupplyModal from "./modals/editSupplyModal";
import ViewSupplyModal from "./modals/viewSupplyModal";


function Supplies() {
    const userRole = "Admin";
    const userName = "Lim Alcovendas";

    const currentDate = new Date().toLocaleString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric",
    });

    const [supplies, setSupplies] = useState([
        {
            id: 1,
            name: "Straw",
            quantity: "50",
            measurement: "Large",
            supplyDate: "2025-05-01",
            status: "Available",
        },
    ]);

    const [showAddSupplyModal, setShowAddSupplyModal] = useState(false);
    const [showEditSupplyModal, setShowEditSupplyModal] = useState(false);
    const [selectedSupply, setSelectedSupply] = useState(null);
    const [showViewSupplyModal, setShowViewSupplyModal] = useState(false);

    const handleView = (supply) => {
        setSelectedSupply(supply);
        setShowViewSupplyModal(true);
    };

    const handleEdit = (supply) => {
        setSelectedSupply(supply);
        setShowEditSupplyModal(true);
    };

    const handleUpdateSupply = (updatedSupply) => {
        setSupplies(prev => prev.map(s => s.id === updatedSupply.id ? updatedSupply : s));
    };

    const handleDelete = (supplyId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this supply?");
        if (confirmDelete) {
            setSupplies((prev) => prev.filter((s) => s.id !== supplyId));
        }
    };

    const columns = [
        { name: "NO.", selector: (row, index) => index + 1, width: "5%" },
        { name: "NAME", selector: (row) => row.name, sortable: true, width: "30%" },
        { name: "QUANTITY", selector: (row) => row.quantity, width: "15%", center: true },
        { name: "MEASUREMENT", selector: (row) => row.measurement, width: "10%", center: true },
        { name: "SUPPLY DATE", selector: (row) => row.supplyDate, width: "15%", center: true },
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
            center: true
        },
    ];

    return (
        <div className="supplies">
            <Sidebar />
            <div className="roles">
                <header className="header">
                    <div className="header-left">
                        <h2 className="page-title">Supplies</h2>
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

                <div className="supply-header">
                    <div className="supply-bottom-row">
                        <input
                            type="text"
                            className="supply-search-box"
                            placeholder="Search supplies..."
                        />
                        <div className="filter-supply-container">
                            <label htmlFor="filter-supply">Filter by Status:</label>
                            <select id="filter-supply" className="filter-supply-select">
                                <option value="all">All</option>
                                <option value="Available">Available</option>
                                <option value="Low Stock">Out of Stock</option>
                                <option value="Out of Stock">Out of Stock</option>
                            </select>
                        </div>

                        <div className="sort-supply-container">
                            <label htmlFor="sort-supply">Sort by:</label>
                            <select id="sort-supply" className="sort-supply-select">
                                <option value="nameAsc">Ascending</option>
                                <option value="nameDesc">Descending</option>
                            </select>
                        </div>

                        <button className="add-supply-button"
                            onClick={() => setShowAddSupplyModal(true)}
                        >
                        + Add Supply & Materials
                        </button>
                    </div>
                </div>

                <div className="supply-content">
                    <DataTable
                        columns={columns}
                        data={supplies}
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

            {showViewSupplyModal && selectedSupply && (
                <ViewSupplyModal
                    supply={selectedSupply}
                    onClose={() => setShowViewSupplyModal(false)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            {showAddSupplyModal && (
                <AddSupplyModal onClose={() => setShowAddSupplyModal(false)} />
            )}

            {showEditSupplyModal && selectedSupply && (
                <EditSupplyModal
                    supply={selectedSupply}
                    onClose={() => setShowEditSupplyModal(false)}
                    onUpdate={handleUpdateSupply}
                />
            )}

        </div>
    );
}

export default Supplies;