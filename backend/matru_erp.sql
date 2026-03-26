-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 26, 2026 at 01:16 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `matru_erp`
--

-- --------------------------------------------------------

--
-- Table structure for table `advance_payments`
--

CREATE TABLE `advance_payments` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `client_name` varchar(120) DEFAULT NULL,
  `amount` float NOT NULL,
  `receipt_date` date NOT NULL,
  `adjusted_amount` float DEFAULT NULL,
  `balance` float NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `advance_payments`
--

INSERT INTO `advance_payments` (`id`, `project_id`, `client_name`, `amount`, `receipt_date`, `adjusted_amount`, `balance`, `remarks`, `created_at`) VALUES
(1, 2, 'Shri Pushkar Devasthan Trust', 500000, '2024-01-20', 500000, 0, 'Mobilization advance - adjusted in INV-STP-2024-001', '2026-03-09 08:24:45'),
(2, 2, 'Shri Pushkar Devasthan Trust', 750000, '2024-07-01', 0, 750000, '2nd advance payment for ongoing work', '2026-03-09 08:24:45'),
(3, 3, 'Mata Durga Seva Samiti', 200000, '2024-05-15', 200000, 0, 'Initial mobilization advance - adjusted in INV-DMM-2024-001', '2026-03-09 08:24:45'),
(4, 3, 'Mata Durga Seva Samiti', 400000, '2024-11-01', 0, 400000, 'Advance for Durga idol manufacturing', '2026-03-09 08:24:45');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `module` varchar(100) NOT NULL,
  `record_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `module`, `record_id`, `description`, `ip_address`, `created_at`) VALUES
(1, 1, 'CREATE', 'projects', 1, NULL, NULL, '2026-03-08 19:04:25'),
(2, 1, 'CREATE', 'item_categories', 1, NULL, NULL, '2026-03-08 21:08:14'),
(3, 1, 'CREATE', 'milestones', 1, NULL, NULL, '2026-03-08 21:09:40'),
(4, 1, 'CREATE', 'milestones', 2, NULL, NULL, '2026-03-08 21:10:29'),
(5, 2, 'CREATE', 'projects', 2, 'Created project: Shiva Temple - Pushkar', '192.168.1.10', '2026-03-09 08:24:45'),
(6, 2, 'CREATE', 'projects', 3, 'Created project: Durga Mata Mandir - Ahmedabad', '192.168.1.10', '2026-03-09 08:24:45'),
(7, 5, 'CREATE', 'stone_blocks', 1, 'Registered stone block BLK-2024-001', '192.168.1.15', '2026-03-09 08:24:45'),
(8, 5, 'SPLIT', 'stone_blocks', 3, 'Block BLK-2024-003 split → child BLK-2024-003A', '192.168.1.15', '2026-03-09 08:24:45'),
(9, 6, 'CREATE', 'sales_invoices', 1, 'Invoice INV-STP-2024-001 created for 1875000', '192.168.1.20', '2026-03-09 08:24:45'),
(10, 3, 'VERIFY', 'installations', 1, 'Installation verified: Pillar P-01', '192.168.1.25', '2026-03-09 08:24:45'),
(11, 1, 'CREATE', 'idol_manufacturing', 4, NULL, NULL, '2026-03-12 18:33:15'),
(12, 1, 'CREATE', 'projects', 4, NULL, NULL, '2026-03-13 19:14:13'),
(13, 1, 'CREATE', 'idol_manufacturing', 5, NULL, NULL, '2026-03-13 19:56:38'),
(14, 1, 'CREATE', 'blueprint_positions', 11, NULL, NULL, '2026-03-13 21:26:15'),
(15, 1, 'CREATE', 'stage_master', 2, NULL, NULL, '2026-03-13 22:45:50'),
(16, 1, 'CREATE', 'stage_master', 3, NULL, NULL, '2026-03-17 13:14:32'),
(17, 1, 'CREATE', 'vendors', 1, NULL, NULL, '2026-03-17 22:15:33'),
(18, 1, 'CREATE', 'warehouses', 5, NULL, NULL, '2026-03-17 22:39:46'),
(19, 1, 'SPLIT', 'stone_blocks', 13, 'Split into 1 children. Residual: 48.0', NULL, '2026-03-18 11:28:46'),
(20, 1, 'CREATE', 'scrap_entries', 1, NULL, NULL, '2026-03-18 22:58:31'),
(21, 1, 'ISSUE', 'sales_invoices', 2, 'INV-DMM-2024-001', NULL, '2026-03-20 17:41:02');

-- --------------------------------------------------------

--
-- Table structure for table `block_allocations`
--

CREATE TABLE `block_allocations` (
  `id` int(11) NOT NULL,
  `stone_block_id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `allocated_by` int(11) DEFAULT NULL,
  `allocation_date` date DEFAULT NULL,
  `is_released` tinyint(1) DEFAULT NULL,
  `released_at` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `block_allocations`
--

INSERT INTO `block_allocations` (`id`, `stone_block_id`, `project_id`, `allocated_by`, `allocation_date`, `is_released`, `released_at`, `remarks`, `created_at`) VALUES
(10, 5, 2, 1, NULL, 0, NULL, NULL, '2026-03-14 00:33:25'),
(11, 21, 2, 1, NULL, 0, NULL, NULL, '2026-03-18 14:08:47'),
(12, 18, 2, 1, NULL, 0, NULL, NULL, '2026-03-19 16:17:30');

-- --------------------------------------------------------

--
-- Table structure for table `blueprint_positions`
--

CREATE TABLE `blueprint_positions` (
  `id` int(11) NOT NULL,
  `layer_id` int(11) NOT NULL,
  `position_code` varchar(30) NOT NULL,
  `description` text DEFAULT NULL,
  `req_length` float DEFAULT NULL,
  `req_width` float DEFAULT NULL,
  `req_height` float DEFAULT NULL,
  `tolerance_pct` float DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `stone_block_id` int(11) DEFAULT NULL,
  `stone_item_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `blueprint_positions`
--

INSERT INTO `blueprint_positions` (`id`, `layer_id`, `position_code`, `description`, `req_length`, `req_width`, `req_height`, `tolerance_pct`, `status`, `is_deleted`, `created_at`, `updated_at`, `stone_block_id`, `stone_item_id`) VALUES
(1, 1, 'F-01', 'NE Corner foundation stone', 5, 3, 2, 0, 'in_progress', 0, '2026-03-09 08:24:44', '2026-03-18 16:29:21', 5, 2),
(2, 1, 'F-02', 'NW Corner foundation stone', 5, 6, 8, 3, 'pending', 0, '2026-03-09 08:24:44', '2026-03-19 16:17:58', 18, 2),
(3, 1, 'F-03', 'SE Corner foundation stone', 4, 4, 1.5, 3, 'completed', 0, '2026-03-09 08:24:44', '2026-03-09 08:24:44', NULL, NULL),
(4, 1, 'F-04', 'SW Corner foundation stone', 4, 4, 1.5, 3, 'completed', 0, '2026-03-09 08:24:44', '2026-03-09 08:24:44', NULL, NULL),
(5, 2, 'B-01', 'Front base slab - center', 5, 6, 8, 2, 'in_progress', 0, '2026-03-09 08:24:45', '2026-03-18 14:08:47', 21, 2),
(6, 2, 'B-02', 'Rear base slab - center', 5, 2, 1, 2, 'pending', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45', NULL, NULL),
(7, 3, 'W-01', 'Front wall panel with Nataraj carving', 3, 0.8, 4, 1.5, 'pending', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45', NULL, NULL),
(8, 3, 'W-02', 'Side wall panel - East with floral motif', 2.5, 0.8, 4, 1.5, 'pending', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45', NULL, NULL),
(9, 6, 'P-01', 'Pillar 1 - Front left', 0.6, 0.6, 3.5, 1, 'completed', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45', NULL, NULL),
(10, 6, 'P-02', 'Pillar 2 - Front right', 0.6, 0.6, 3.5, 1, 'in_progress', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45', NULL, NULL),
(11, 2, 'F-03', 'POsition', 6, 4, 3, 3, 'in_progress', 0, '2026-03-13 21:26:14', '2026-03-13 23:02:22', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `contractors`
--

CREATE TABLE `contractors` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `pan` varchar(10) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `state` varchar(60) DEFAULT NULL,
  `state_code` varchar(5) DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `contractors`
--

INSERT INTO `contractors` (`id`, `name`, `gstin`, `pan`, `phone`, `email`, `address`, `state`, `state_code`, `is_deleted`, `created_at`) VALUES
(1, 'Shilp Kala Stone Works', '08ABCSS1234A1ZQ', 'ABCSS1234A', '9876543210', 'info@shilpkala.com', '12, Kalawad Road, Rajkot, Gujarat 360005', 'Gujarat', '24', 0, '2026-03-09 08:24:45'),
(2, 'Raj Murti Kala Kendra', '08AACCR9876B1ZP', 'AACCR9876B', '9988776655', 'rajmurti@gmail.com', 'Old City, Near Chandpol, Jaipur, Rajasthan 302001', 'Rajasthan', '08', 0, '2026-03-09 08:24:45'),
(3, 'Gujarat Carving Specialists', '24AADCG4567C1ZM', 'AADCG4567C', '9123456789', 'gcs@carving.co.in', 'Ring Road, Surat, Gujarat 395002', 'Gujarat', '24', 0, '2026-03-09 08:24:45');

-- --------------------------------------------------------

--
-- Table structure for table `contractor_agreements`
--

CREATE TABLE `contractor_agreements` (
  `id` int(11) NOT NULL,
  `contractor_id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `agreement_no` varchar(60) NOT NULL,
  `contract_value` float NOT NULL,
  `gst_pct` float DEFAULT NULL,
  `tds_pct` float DEFAULT NULL,
  `retention_pct` float DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `scope_of_work` text DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `contractor_agreements`
--

INSERT INTO `contractor_agreements` (`id`, `contractor_id`, `project_id`, `agreement_no`, `contract_value`, `gst_pct`, `tds_pct`, `retention_pct`, `start_date`, `end_date`, `scope_of_work`, `is_deleted`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 'AGR-STP-001', 1800000, 18, 2, 5, '2024-02-01', '2025-01-31', 'Supply and carving of decorative wall panels for Jangha section. Includes all finishing work and site installation of 12 panels.', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45'),
(2, 2, 2, 'AGR-STP-002', 950000, 18, 2, 5, '2024-03-01', '2024-12-31', 'Carving of 16 mandapa pillars with traditional motifs.', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45'),
(3, 3, 3, 'AGR-DMM-001', 1200000, 18, 2, 5, '2024-07-01', '2026-06-30', 'Complete stone carving and installation for Durga Mandir gopuram and mandapa.', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45');

-- --------------------------------------------------------

--
-- Table structure for table `contractor_invoices`
--

CREATE TABLE `contractor_invoices` (
  `id` int(11) NOT NULL,
  `agreement_id` int(11) NOT NULL,
  `milestone_id` int(11) DEFAULT NULL,
  `invoice_no` varchar(60) NOT NULL,
  `invoice_date` date NOT NULL,
  `gross_amount` float NOT NULL,
  `gst_amount` float DEFAULT NULL,
  `tds_amount` float DEFAULT NULL,
  `retention_amount` float DEFAULT NULL,
  `net_payable` float NOT NULL,
  `payment_status` varchar(30) DEFAULT NULL,
  `paid_amount` float DEFAULT NULL,
  `paid_date` date DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `contractor_invoices`
--

INSERT INTO `contractor_invoices` (`id`, `agreement_id`, `milestone_id`, `invoice_no`, `invoice_date`, `gross_amount`, `gst_amount`, `tds_amount`, `retention_amount`, `net_payable`, `payment_status`, `paid_amount`, `paid_date`, `remarks`, `is_deleted`, `created_at`, `updated_at`) VALUES
(1, 1, 3, 'CINV-2024-001', '2024-07-05', 450000, 81000, 9000, 22500, 499500, 'paid', 499500, '2024-07-20', '1st running bill for wall panels supply', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45'),
(2, 1, NULL, 'CINV-2024-002', '2024-10-10', 600000, 108000, 12000, 30000, 666000, 'partial', 350000, NULL, '2nd running bill - partial payment received', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45'),
(3, 2, 4, 'CINV-2024-003', '2024-09-01', 380000, 68400, 7600, 19000, 421800, 'paid', 421800, '2024-09-15', 'Pillar carving - 8 of 16 pillars completed', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45');

-- --------------------------------------------------------

--
-- Table structure for table `dispatches`
--

CREATE TABLE `dispatches` (
  `id` int(11) NOT NULL,
  `dispatch_note_no` varchar(60) NOT NULL,
  `project_id` int(11) NOT NULL,
  `from_warehouse_id` int(11) NOT NULL,
  `to_warehouse_id` int(11) NOT NULL,
  `dispatch_date` date NOT NULL,
  `transporter_name` varchar(150) DEFAULT NULL,
  `vehicle_no` varchar(30) DEFAULT NULL,
  `lr_no` varchar(60) DEFAULT NULL,
  `eway_bill_no` varchar(30) DEFAULT NULL,
  `eway_bill_date` date DEFAULT NULL,
  `total_value` float DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `dispatches`
--

INSERT INTO `dispatches` (`id`, `dispatch_note_no`, `project_id`, `from_warehouse_id`, `to_warehouse_id`, `dispatch_date`, `transporter_name`, `vehicle_no`, `lr_no`, `eway_bill_no`, `eway_bill_date`, `total_value`, `remarks`, `is_deleted`, `created_by`, `created_at`) VALUES
(1, 'DN-2024-001', 2, 1, 2, '2024-04-10', 'Rajasthan Roadways Transport', 'RJ14GC4532', 'LR-2024-4532', '0812345678901', '2024-04-10', 27000, 'Foundation stone components - batch 1', 0, 7, '2026-03-09 08:24:45'),
(2, 'DN-2024-002', 2, 1, 2, '2024-07-22', 'Shree Ram Logistics', 'RJ01CB9871', 'LR-2024-9871', '0898765432101', '2024-07-22', 45500, 'Mandapa pillar P-01 and hardware', 0, 7, '2026-03-09 08:24:45');

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_items`
--

CREATE TABLE `dispatch_items` (
  `id` int(11) NOT NULL,
  `dispatch_id` int(11) NOT NULL,
  `stone_block_id` int(11) DEFAULT NULL,
  `item_id` int(11) DEFAULT NULL,
  `qty` float DEFAULT NULL,
  `rate` float DEFAULT NULL,
  `value` float DEFAULT NULL,
  `hsn_code` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `dispatch_items`
--

INSERT INTO `dispatch_items` (`id`, `dispatch_id`, `stone_block_id`, `item_id`, `qty`, `rate`, `value`, `hsn_code`) VALUES
(1, 1, 6, NULL, 1, 27000, 27000, '2515'),
(2, 2, 6, NULL, 1, 43750, 43750, '2515'),
(3, 2, NULL, 5, 50, 35, 1750, '7317');

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_item_serials`
--

CREATE TABLE `dispatch_item_serials` (
  `id` int(11) NOT NULL,
  `dispatch_item_id` int(11) NOT NULL,
  `serial_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_workflows`
--

CREATE TABLE `dispatch_workflows` (
  `id` int(11) NOT NULL,
  `dispatch_id` int(11) NOT NULL,
  `status` varchar(30) NOT NULL,
  `challan_no` varchar(60) DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `confirmed_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `idol_manufacturing`
--

CREATE TABLE `idol_manufacturing` (
  `id` int(11) NOT NULL,
  `serial_no` varchar(60) NOT NULL,
  `stone_block_id` int(11) NOT NULL,
  `project_id` int(11) DEFAULT NULL,
  `idol_name` varchar(120) NOT NULL,
  `description` text DEFAULT NULL,
  `total_labor_hours` float DEFAULT NULL,
  `total_stage_cost` float DEFAULT NULL,
  `total_manufacturing_cost` float DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `idol_manufacturing`
--

INSERT INTO `idol_manufacturing` (`id`, `serial_no`, `stone_block_id`, `project_id`, `idol_name`, `description`, `total_labor_hours`, `total_stage_cost`, `total_manufacturing_cost`, `status`, `is_deleted`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'IDL-2024-001', 27, 2, 'Lord Shiva (Nataraja) - Main Deity', '5ft seated Nataraja idol in Makrana white marble', 420, 207500, 207500, 'in_progress', 0, 4, '2026-03-09 08:24:45', '2026-03-17 23:55:40'),
(2, 'IDL-2024-002', 2, 2, 'Nandi Bull - Entrance Idol', 'Life-size Nandi idol for temple entrance', 180, 72000, 150750, 'completed', 0, 4, '2026-03-09 08:24:45', '2026-03-09 08:24:45'),
(3, 'IDL-2024-003', 5, 3, 'Durga Mata - Main Deity', '4ft standing Durga idol in black granite', 290, 128000, 194000, 'in_progress', 0, 4, '2026-03-09 08:24:45', '2026-03-09 08:24:45'),
(4, 'IDOL-3466D7A8', 15, 1, 'kk', 'knn', 0, 0, 0, 'completed', 0, 1, '2026-03-12 18:33:15', '2026-03-13 17:34:28'),
(5, 'IDOL-11DB79E2', 16, 4, 'Ganeshji', 'Ganeshji', 13, 3300, 3300, 'completed', 0, 1, '2026-03-13 19:56:36', '2026-03-17 17:02:11');

-- --------------------------------------------------------

--
-- Table structure for table `idol_materials`
--

CREATE TABLE `idol_materials` (
  `id` int(11) NOT NULL,
  `idol_id` int(11) NOT NULL,
  `item_id` int(11) DEFAULT NULL,
  `stone_block_id` int(11) DEFAULT NULL,
  `qty` float NOT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `idol_materials`
--

INSERT INTO `idol_materials` (`id`, `idol_id`, `item_id`, `stone_block_id`, `qty`, `created_at`) VALUES
(1, 5, 1, 16, 1, '2026-03-13 19:56:37'),
(2, 5, 1, 17, 1, '2026-03-13 19:56:37'),
(3, 5, 3, NULL, 1, '2026-03-13 19:56:37'),
(5, 1, 2, 27, 1, '2026-03-17 23:55:40');

-- --------------------------------------------------------

--
-- Table structure for table `idol_sales`
--

CREATE TABLE `idol_sales` (
  `id` int(11) NOT NULL,
  `idol_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `customer_name` varchar(150) NOT NULL,
  `customer_gstin` varchar(20) DEFAULT NULL,
  `sale_date` date NOT NULL,
  `sale_amount` float DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `idol_sales`
--

INSERT INTO `idol_sales` (`id`, `idol_id`, `warehouse_id`, `customer_name`, `customer_gstin`, `sale_date`, `sale_amount`, `remarks`, `created_by`, `created_at`) VALUES
(1, 5, 4, 'Akshay Maske', NULL, '2026-03-19', 150000, NULL, 1, '2026-03-19 09:59:25');

-- --------------------------------------------------------

--
-- Table structure for table `idol_stock_movements`
--

CREATE TABLE `idol_stock_movements` (
  `id` int(11) NOT NULL,
  `idol_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `movement_type` varchar(30) NOT NULL,
  `qty_in` float DEFAULT NULL,
  `qty_out` float DEFAULT NULL,
  `balance_qty` float NOT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `idol_stock_movements`
--

INSERT INTO `idol_stock_movements` (`id`, `idol_id`, `warehouse_id`, `movement_type`, `qty_in`, `qty_out`, `balance_qty`, `reference_type`, `reference_id`, `remarks`, `created_by`, `created_at`) VALUES
(1, 2, 3, 'inward', 1, 0, 1, 'idol_completion', 2, NULL, 1, '2026-03-19 09:49:48'),
(2, 5, 4, 'inward', 1, 0, 1, 'idol_completion', 5, NULL, 1, '2026-03-19 09:58:00'),
(3, 5, 4, 'outward', 0, 1, 0, 'idol_sale', 5, NULL, 1, '2026-03-19 09:59:25');

-- --------------------------------------------------------

--
-- Table structure for table `installations`
--

CREATE TABLE `installations` (
  `id` int(11) NOT NULL,
  `stone_block_id` int(11) NOT NULL,
  `position_id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `installation_date` date DEFAULT NULL,
  `installed_by` int(11) DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `installations`
--

INSERT INTO `installations` (`id`, `stone_block_id`, `position_id`, `project_id`, `installation_date`, `installed_by`, `status`, `verified_by`, `verified_at`, `remarks`, `is_deleted`, `created_at`, `updated_at`) VALUES
(1, 6, 9, 2, '2024-08-05', 7, 'verified', 3, '2024-08-06 10:30:00', 'Pillar P-01 installed and plumb verified', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45'),
(2, 4, 1, 2, '2024-05-20', 7, 'verified', 3, '2024-05-21 09:00:00', 'NE foundation stone installed', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45');

-- --------------------------------------------------------

--
-- Table structure for table `installation_photos`
--

CREATE TABLE `installation_photos` (
  `id` int(11) NOT NULL,
  `installation_id` int(11) NOT NULL,
  `file_path` varchar(300) NOT NULL,
  `caption` varchar(200) DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice_dispatch_allocations`
--

CREATE TABLE `invoice_dispatch_allocations` (
  `id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `dispatch_id` int(11) NOT NULL,
  `dispatch_item_id` int(11) NOT NULL,
  `billed_qty` float NOT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice_line_items`
--

CREATE TABLE `invoice_line_items` (
  `id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `description` varchar(200) NOT NULL,
  `hsn_code` varchar(20) DEFAULT NULL,
  `qty` float DEFAULT NULL,
  `rate` float NOT NULL,
  `amount` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `invoice_line_items`
--

INSERT INTO `invoice_line_items` (`id`, `invoice_id`, `description`, `hsn_code`, `qty`, `rate`, `amount`) VALUES
(1, 1, 'Foundation plinth - Makrana marble stone supply & installation', '2515', 1, 1875000, 1875000),
(2, 2, 'Site preparation, foundation excavation & plinth stone work', '2515', 1, 1000000, 1000000),
(3, 2, 'Temporary site infrastructure and tool setup', '9954', 1, 312500, 312500);

-- --------------------------------------------------------

--
-- Table structure for table `invoice_workflows`
--

CREATE TABLE `invoice_workflows` (
  `id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `status` varchar(30) NOT NULL,
  `issued_at` datetime DEFAULT NULL,
  `issued_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invoice_workflows`
--

INSERT INTO `invoice_workflows` (`id`, `invoice_id`, `status`, `issued_at`, `issued_by`, `created_at`, `updated_at`) VALUES
(1, 2, 'issued', '2026-03-20 12:11:02', 1, '2026-03-20 17:41:02', '2026-03-20 17:41:02');

-- --------------------------------------------------------

--
-- Table structure for table `items`
--

CREATE TABLE `items` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `code` varchar(50) NOT NULL,
  `category_id` int(11) NOT NULL,
  `uom` varchar(20) DEFAULT NULL,
  `valuation_method` varchar(20) DEFAULT NULL,
  `reorder_level` float DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `has_serial_no` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `items`
--

INSERT INTO `items` (`id`, `name`, `code`, `category_id`, `uom`, `valuation_method`, `reorder_level`, `is_deleted`, `created_at`, `updated_at`, `has_serial_no`) VALUES
(1, 'White Makrana Marble Block', 'STN-WMM-001', 2, 'cft', 'weighted_avg', 50, 0, '2026-03-09 08:24:44', '2026-03-13 09:06:25', 1),
(2, 'Black Granite Block', 'STN-BLK-002', 2, 'cft', 'weighted_avg', 30, 0, '2026-03-09 08:24:44', '2026-03-13 09:06:36', 1),
(3, 'Pneumatic Chisel Set', 'TOOL-PCH-001', 3, 'set', 'fifo', 2, 0, '2026-03-09 08:24:44', '2026-03-13 09:06:59', 1),
(4, 'Diamond Polishing Compound', 'CHM-DPC-001', 4, 'kg', 'weighted_avg', 10, 0, '2026-03-09 08:24:44', '2026-03-09 08:24:44', 0),
(5, 'SS Anchor Bolt M12x150', 'HW-ANB-001', 5, 'pcs', 'weighted_avg', 100, 0, '2026-03-09 08:24:44', '2026-03-09 08:24:44', 0),
(7, 'Ganeshji', 'FG-IDOL-5', 7, 'pcs', 'weighted_avg', 0, 0, '2026-03-19 09:58:00', '2026-03-19 09:58:00', 1);

-- --------------------------------------------------------

--
-- Table structure for table `item_categories`
--

CREATE TABLE `item_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `item_type` varchar(30) NOT NULL,
  `hsn_code` varchar(20) DEFAULT NULL,
  `gst_rate` float DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `item_categories`
--

INSERT INTO `item_categories` (`id`, `name`, `item_type`, `hsn_code`, `gst_rate`, `description`, `is_deleted`, `created_at`, `updated_at`) VALUES
(1, 'Cat1', 'serialized', 'AHSL', 18, 'SES', 0, '2026-03-08 21:08:14', '2026-03-08 21:08:14'),
(2, 'Stone Blocks', 'dimensional', '2515', 5, 'Marble and granite blocks for carving', 0, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(3, 'Carving Tools', 'serialized', '8205', 18, 'Chisels, hammers and pneumatic tools', 0, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(4, 'Chemicals & Consumables', 'batch', '3814', 18, 'Polishing compounds, adhesives, sealants', 0, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(5, 'Hardware & Fixtures', 'batch', '7317', 18, 'Anchors, dowels, clamps', 0, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(7, 'Finished Idols', 'serialized', NULL, 18, 'Auto-created category for completed idol stock', 0, '2026-03-19 09:58:00', '2026-03-19 09:58:00');

-- --------------------------------------------------------

--
-- Table structure for table `item_reservations`
--

CREATE TABLE `item_reservations` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `qty` float NOT NULL,
  `is_released` tinyint(1) DEFAULT NULL,
  `released_at` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `item_reservations`
--

INSERT INTO `item_reservations` (`id`, `project_id`, `item_id`, `warehouse_id`, `qty`, `is_released`, `released_at`, `created_by`, `created_at`) VALUES
(2, 1, 4, 1, 1, 1, '2026-03-13 06:27:05', 1, '2026-03-12 22:55:10'),
(3, 1, 3, 1, 1, 1, '2026-03-13 09:38:25', 1, '2026-03-13 15:03:42'),
(4, 1, 4, 1, 1, 1, '2026-03-13 09:38:25', 1, '2026-03-13 15:03:42'),
(5, 4, 1, 1, 2, 0, NULL, 1, '2026-03-13 19:14:12'),
(6, 4, 3, 1, 1, 0, NULL, 1, '2026-03-13 19:14:12');

-- --------------------------------------------------------

--
-- Table structure for table `item_serials`
--

CREATE TABLE `item_serials` (
  `id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `serial_no` varchar(100) NOT NULL,
  `status` varchar(30) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `item_serials`
--

INSERT INTO `item_serials` (`id`, `item_id`, `warehouse_id`, `serial_no`, `status`, `reference_type`, `reference_id`, `created_at`) VALUES
(1, 3, 2, 'TOOL-PCH-001-SN-226C83BD', 'available', 'purchase_order', 8, '2026-03-13 09:08:40'),
(2, 3, 2, 'TOOL-PCH-001-SN-A12B29E0', 'available', 'purchase_order', 8, '2026-03-13 09:08:40'),
(3, 3, 2, 'TOOL-PCH-001-SN-90131CE8', 'issued', 'idol', 5, '2026-03-13 09:08:40'),
(4, 7, 4, 'IDOL-11DB79E2', 'issued', 'idol_sale', 5, '2026-03-19 09:58:00');

-- --------------------------------------------------------

--
-- Table structure for table `job_works`
--

CREATE TABLE `job_works` (
  `id` int(11) NOT NULL,
  `challan_no` varchar(60) NOT NULL,
  `stone_block_id` int(11) NOT NULL,
  `vendor_name` varchar(150) NOT NULL,
  `vendor_gstin` varchar(20) DEFAULT NULL,
  `from_warehouse_id` int(11) NOT NULL,
  `job_work_warehouse_id` int(11) DEFAULT NULL,
  `dispatch_date` date NOT NULL,
  `expected_return_date` date DEFAULT NULL,
  `actual_return_date` date DEFAULT NULL,
  `job_description` text DEFAULT NULL,
  `job_cost` float DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  `return_length` float DEFAULT NULL,
  `return_width` float DEFAULT NULL,
  `return_height` float DEFAULT NULL,
  `wastage_volume` float DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `job_works`
--

INSERT INTO `job_works` (`id`, `challan_no`, `stone_block_id`, `vendor_name`, `vendor_gstin`, `from_warehouse_id`, `job_work_warehouse_id`, `dispatch_date`, `expected_return_date`, `actual_return_date`, `job_description`, `job_cost`, `status`, `return_length`, `return_width`, `return_height`, `wastage_volume`, `is_deleted`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'JW-2024-001', 7, 'Makrana Marble Works Pvt Ltd', '08AAACM5678A1ZC', 1, 4, '2024-05-01', '2024-06-15', '2024-06-10', 'Rough cutting and squaring of pink sandstone block', 8500, 'returned', 2.45, 1.95, 1.48, 0.56, 0, 5, '2026-03-09 08:24:45', '2026-03-09 08:24:45'),
(2, 'JW-2024-002', 2, 'Makrana Marble Works Pvt Ltd', '08AAACM5678A1ZC', 1, 4, '2024-08-05', '2024-09-20', NULL, 'Surface finishing and fluting for pillar blocks', 12000, 'dispatched', NULL, NULL, NULL, 0, 0, 5, '2026-03-09 08:24:45', '2026-03-09 08:24:45');

-- --------------------------------------------------------

--
-- Table structure for table `manufacturing_photos`
--

CREATE TABLE `manufacturing_photos` (
  `id` int(11) NOT NULL,
  `idol_id` int(11) NOT NULL,
  `stage_id` int(11) DEFAULT NULL,
  `file_path` varchar(300) NOT NULL,
  `caption` varchar(200) DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `manufacturing_stages`
--

CREATE TABLE `manufacturing_stages` (
  `id` int(11) NOT NULL,
  `idol_id` int(11) NOT NULL,
  `stage_name` varchar(120) NOT NULL,
  `stage_order` int(11) NOT NULL,
  `labor_hours` float DEFAULT NULL,
  `labor_rate` float DEFAULT NULL,
  `material_cost` float DEFAULT NULL,
  `stage_cost` float DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `stage_master_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `manufacturing_stages`
--

INSERT INTO `manufacturing_stages` (`id`, `idol_id`, `stage_name`, `stage_order`, `labor_hours`, `labor_rate`, `material_cost`, `stage_cost`, `status`, `started_at`, `completed_at`, `remarks`, `created_at`, `updated_at`, `stage_master_id`) VALUES
(1, 1, 'Rough Shaping', 1, 80, 350, 5000, 33000, 'completed', '2024-02-01 00:00:00', '2024-02-20 00:00:00', 'Rough outline chiseled', '2026-03-09 08:24:45', '2026-03-09 08:24:45', NULL),
(2, 1, 'Detailed Carving - Body', 2, 150, 400, 8000, 68000, 'completed', '2024-02-21 00:00:00', '2024-04-10 00:00:00', 'Body proportions completed', '2026-03-09 08:24:45', '2026-03-09 08:24:45', NULL),
(3, 1, 'Face & Ornament Carving', 3, 120, 500, 12000, 72000, 'in_progress', '2024-04-11 00:00:00', NULL, 'Facial features 70% done', '2026-03-09 08:24:45', '2026-03-09 08:24:45', NULL),
(4, 1, 'Final Finishing & Polish', 4, 70, 450, 3000, 34500, 'pending', NULL, NULL, 'Pending completion of face', '2026-03-09 08:24:45', '2026-03-09 08:24:45', NULL),
(5, 2, 'Rough Shaping', 1, 60, 350, 3000, 24000, 'completed', '2024-01-20 00:00:00', '2024-02-05 00:00:00', NULL, '2026-03-09 08:24:45', '2026-03-09 08:24:45', NULL),
(6, 2, 'Detailed Carving', 2, 90, 400, 6000, 42000, 'completed', '2024-02-06 00:00:00', '2024-03-15 00:00:00', NULL, '2026-03-09 08:24:45', '2026-03-09 08:24:45', NULL),
(7, 2, 'Polish & Finish', 3, 30, 450, 1500, 15000, 'completed', '2024-03-16 00:00:00', '2024-03-25 00:00:00', NULL, '2026-03-09 08:24:45', '2026-03-09 08:24:45', NULL),
(8, 3, 'Rough Shaping', 1, 60, 400, 4000, 28000, 'completed', '2024-07-01 00:00:00', '2024-07-20 00:00:00', NULL, '2026-03-09 08:24:45', '2026-03-09 08:24:45', NULL),
(9, 3, 'Body Carving', 2, 130, 450, 8000, 66500, 'in_progress', '2024-07-21 00:00:00', NULL, '8 arms being carved', '2026-03-09 08:24:45', '2026-03-09 08:24:45', NULL),
(10, 4, 'cutting', 1, 1, 7, 1000, 1007, 'completed', NULL, NULL, NULL, '2026-03-12 18:33:47', '2026-03-13 16:52:03', NULL),
(11, 5, 'Cutting', 1, 8, 100, 1500, 2300, 'completed', NULL, NULL, NULL, '2026-03-13 20:06:03', '2026-03-13 23:10:01', NULL),
(12, 5, 'Carving', 2, 5, 100, 500, 1000, 'completed', NULL, NULL, NULL, '2026-03-13 22:52:15', '2026-03-17 17:01:50', 2),
(13, 1, 'Polishing', 5, 8, 100, 500, 1300, 'pending', NULL, NULL, NULL, '2026-03-17 13:16:26', '2026-03-17 13:16:26', 3);

-- --------------------------------------------------------

--
-- Table structure for table `milestones`
--

CREATE TABLE `milestones` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `milestone_value` float DEFAULT NULL,
  `completion_pct` float DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `milestones`
--

INSERT INTO `milestones` (`id`, `project_id`, `name`, `description`, `milestone_value`, `completion_pct`, `status`, `due_date`, `completed_date`, `is_deleted`, `created_at`, `updated_at`) VALUES
(1, 1, 'M1', 'Milestone 1', 100000, 0, 'pending', '2026-04-08', NULL, 0, '2026-03-08 21:09:40', '2026-03-08 21:09:40'),
(2, 1, 'M1', 'Milestone 1', 10000, 0, 'pending', '2026-03-08', NULL, 0, '2026-03-08 21:10:29', '2026-03-08 21:10:29'),
(3, 2, 'Foundation & Plinth Completion', 'All foundation stones placed and verified', 1875000, 100, 'completed', '2024-06-30', '2024-06-15', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45'),
(4, 2, 'Base Platform (Pitha) Complete', 'Elevated platform fully installed', 2500000, 60, 'in_progress', '2024-12-31', NULL, 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45'),
(5, 2, 'Wall Carvings & Mandapa Pillars', 'All decorative wall panels and pillars installed', 3125000, 0, 'pending', '2025-08-31', NULL, 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45'),
(6, 2, 'Shikhara Crown & Finials', 'Top sections and kalasha installed', 2500000, 0, 'pending', '2026-03-31', NULL, 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45'),
(7, 3, 'Site Preparation & Foundation', 'Site leveling, foundation stone work', 1312500, 100, 'completed', '2024-09-30', '2024-09-20', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45'),
(8, 3, 'Mandapa & Entrance Gate', 'Mandapa pillars and entrance gopuram', 2625000, 20, 'in_progress', '2025-06-30', NULL, 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45');

-- --------------------------------------------------------

--
-- Table structure for table `position_dependencies`
--

CREATE TABLE `position_dependencies` (
  `id` int(11) NOT NULL,
  `position_id` int(11) NOT NULL,
  `depends_on_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `position_dependencies`
--

INSERT INTO `position_dependencies` (`id`, `position_id`, `depends_on_id`, `created_at`) VALUES
(1, 5, 1, '2026-03-09 08:24:45'),
(2, 5, 2, '2026-03-09 08:24:45'),
(3, 6, 3, '2026-03-09 08:24:45'),
(4, 6, 4, '2026-03-09 08:24:45'),
(5, 7, 5, '2026-03-09 08:24:45'),
(6, 8, 5, '2026-03-09 08:24:45');

-- --------------------------------------------------------

--
-- Table structure for table `position_stages`
--

CREATE TABLE `position_stages` (
  `id` int(11) NOT NULL,
  `position_id` int(11) NOT NULL,
  `stage_id` int(11) NOT NULL,
  `status` varchar(30) DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `stage_order` int(11) DEFAULT NULL,
  `labor_hours` float DEFAULT NULL,
  `labor_rate` float DEFAULT NULL,
  `material_cost` float DEFAULT NULL,
  `stage_cost` float DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `position_stages`
--

INSERT INTO `position_stages` (`id`, `position_id`, `stage_id`, `status`, `created_at`, `updated_at`, `stage_order`, `labor_hours`, `labor_rate`, `material_cost`, `stage_cost`, `remarks`, `started_at`, `completed_at`) VALUES
(1, 11, 1, 'in_progress', '2026-03-13 22:51:29', '2026-03-13 23:04:18', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 11, 2, 'completed', '2026-03-13 22:51:29', '2026-03-13 23:02:23', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 1, 2, 'pending', '2026-03-13 23:32:11', '2026-03-18 16:29:21', 2, 8, 300, 800, 3200, NULL, NULL, NULL),
(4, 1, 1, 'completed', '2026-03-13 23:32:11', '2026-03-18 22:51:10', 1, 5, 400, 800, 2800, NULL, NULL, NULL),
(5, 1, 3, 'pending', '2026-03-17 19:36:44', '2026-03-18 16:29:21', 3, 3, 200, 800, 1400, NULL, NULL, NULL),
(7, 2, 1, 'pending', '2026-03-19 16:17:58', '2026-03-19 16:18:26', 1, 8, 300, 2000, 4400, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `code` varchar(30) NOT NULL,
  `location` varchar(200) DEFAULT NULL,
  `state` varchar(60) DEFAULT NULL,
  `state_code` varchar(5) DEFAULT NULL,
  `client_name` varchar(120) DEFAULT NULL,
  `client_gstin` varchar(20) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `expected_end_date` date DEFAULT NULL,
  `total_value` float DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  `completion_pct` float DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `projects`
--

INSERT INTO `projects` (`id`, `name`, `code`, `location`, `state`, `state_code`, `client_name`, `client_gstin`, `start_date`, `expected_end_date`, `total_value`, `status`, `completion_pct`, `is_deleted`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'Iskcon Nashik', 'iskcon-nashik', NULL, NULL, NULL, NULL, NULL, '2026-03-12', '2026-03-19', 0, 'active', 0, 1, 1, '2026-03-08 19:04:24', '2026-03-13 18:44:10'),
(2, 'Shiva Temple - Pushkar', 'shiva-temple---pushkar', 'Pushkar, Rajasthan', NULL, NULL, NULL, NULL, '2024-01-15', '2026-06-30', 12500000, 'active', 42, 0, 2, '2026-03-09 08:24:44', '2026-03-10 00:42:10'),
(3, 'Durga Mata Mandir - Ahmedabad', 'DMM-002', 'Ahmedabad, Gujarat', 'Gujarat', '24', 'Mata Durga Seva Samiti', '24BBBCS5678B2ZC', '2024-06-01', '2027-03-31', 8750000, 'active', 18, 0, 2, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(4, 'Iskon Nashik', 'IS-2026-01', NULL, NULL, NULL, NULL, NULL, '2026-03-25', '2026-04-10', 50000, 'active', 0, 0, 1, '2026-03-13 19:14:11', '2026-03-13 19:14:11');

-- --------------------------------------------------------

--
-- Table structure for table `project_costs`
--

CREATE TABLE `project_costs` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `cost_type` varchar(30) NOT NULL,
  `description` varchar(200) DEFAULT NULL,
  `amount` float NOT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `project_costs`
--

INSERT INTO `project_costs` (`id`, `project_id`, `cost_type`, `description`, `amount`, `reference_type`, `reference_id`, `date`, `created_by`, `created_at`) VALUES
(1, 2, 'material', 'Makrana marble blocks - first purchase', 360000, NULL, NULL, '2024-01-25', 6, '2026-03-09 08:24:45'),
(2, 2, 'contractor', 'Contractor invoice CINV-2024-001', 499500, 'contractor_invoice', 1, '2024-07-20', 6, '2026-03-09 08:24:45'),
(3, 2, 'labor', 'Idol manufacturing - labor cost for Nataraja', 186000, NULL, NULL, '2024-09-30', 6, '2026-03-09 08:24:45'),
(4, 2, 'site_expense', 'Scaffolding and site equipment hire', 45000, NULL, NULL, '2024-04-15', 6, '2026-03-09 08:24:45'),
(5, 2, 'site_expense', 'Site transportation and logistics', 28500, NULL, NULL, '2024-07-25', 6, '2026-03-09 08:24:45'),
(6, 3, 'material', 'Black granite blocks purchase', 176000, NULL, NULL, '2024-06-10', 6, '2026-03-09 08:24:45'),
(7, 3, 'labor', 'Durga idol manufacturing cost', 128000, NULL, NULL, '2024-11-30', 6, '2026-03-09 08:24:45'),
(8, 3, 'site_expense', 'Ahmedabad site setup and boundary wall', 62000, NULL, NULL, '2024-06-20', 6, '2026-03-09 08:24:45');

-- --------------------------------------------------------

--
-- Table structure for table `project_materials`
--

CREATE TABLE `project_materials` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `item_id` int(11) DEFAULT NULL,
  `stone_block_id` int(11) DEFAULT NULL,
  `required_qty` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `project_materials`
--

INSERT INTO `project_materials` (`id`, `project_id`, `item_id`, `stone_block_id`, `required_qty`) VALUES
(10, 2, 4, NULL, 1),
(11, 2, 2, 12, 1),
(47, 4, 1, NULL, 2),
(48, 4, 3, NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `project_material_serials`
--

CREATE TABLE `project_material_serials` (
  `id` int(11) NOT NULL,
  `project_material_id` int(11) NOT NULL,
  `item_serial_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `id` int(11) NOT NULL,
  `po_number` varchar(60) NOT NULL,
  `vendor_name` varchar(150) NOT NULL,
  `vendor_gstin` varchar(20) DEFAULT NULL,
  `po_date` date NOT NULL,
  `expected_delivery` date DEFAULT NULL,
  `total_amount` float NOT NULL,
  `status` varchar(30) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `vendor_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchase_orders`
--

INSERT INTO `purchase_orders` (`id`, `po_number`, `vendor_name`, `vendor_gstin`, `po_date`, `expected_delivery`, `total_amount`, `status`, `remarks`, `is_deleted`, `created_by`, `created_at`, `updated_at`, `vendor_id`) VALUES
(4, 'PO-GEN-2026-001', 'Vinit Wani', '', '2026-03-11', '2026-03-12', 10800, 'received', '', 0, 1, '2026-03-11 19:45:27', '2026-03-11 22:44:21', NULL),
(6, 'PO-GEN-2026-005', 'Shrenik Sonje', NULL, '2026-03-11', '2026-03-12', 25200, 'received', NULL, 0, 1, '2026-03-11 23:12:17', '2026-03-11 23:12:47', NULL),
(7, 'PO-GEN-2026-007', 'Narendra Bhole', NULL, '2026-03-13', '2026-03-13', 74000, 'received', NULL, 0, 1, '2026-03-12 23:07:15', '2026-03-12 23:08:12', NULL),
(8, 'PO-GEN-2026-008', 'Shubham Parekh', NULL, '2026-03-13', '2026-03-13', 181800, 'received', NULL, 0, 1, '2026-03-13 09:08:20', '2026-03-13 09:08:40', NULL),
(9, 'PO-GEN-2026-009', 'Soham Jawale', NULL, '2026-03-16', '2026-03-17', 120960, 'approved', NULL, 0, 1, '2026-03-16 23:05:04', '2026-03-17 18:15:19', NULL),
(10, 'PO-GEN-2026-010', 'Akshay MAske', NULL, '2026-03-17', '2026-03-18', 86371.2, 'received', NULL, 0, 1, '2026-03-17 22:24:14', '2026-03-17 22:24:50', 1),
(11, 'PO-GEN-2026-011', 'Akshay MAske', NULL, '2026-03-17', '2026-03-17', 67500, 'received', NULL, 0, 1, '2026-03-17 23:16:08', '2026-03-17 23:22:57', 1);

-- --------------------------------------------------------

--
-- Table structure for table `purchase_order_items`
--

CREATE TABLE `purchase_order_items` (
  `id` int(11) NOT NULL,
  `po_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `qty` float NOT NULL,
  `rate` float NOT NULL,
  `amount` float NOT NULL,
  `received_qty` float DEFAULT NULL,
  `length` float DEFAULT NULL,
  `width` float DEFAULT NULL,
  `height` float DEFAULT NULL,
  `cft` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchase_order_items`
--

INSERT INTO `purchase_order_items` (`id`, `po_id`, `item_id`, `qty`, `rate`, `amount`, `received_qty`, `length`, `width`, `height`, `cft`) VALUES
(1, 4, 2, 3, 60, 10800, 3, 4, 5, 3, 180),
(3, 6, 1, 4, 30, 25200, 4, 5, 6, 7, 840),
(4, 7, 2, 5, 60, 72000, 5, 5, 6, 8, 1200),
(5, 7, 4, 4, 500, 2000, 4, NULL, NULL, NULL, NULL),
(6, 8, 1, 2, 30, 180000, 2, 15, 20, 10, 6000),
(7, 8, 3, 3, 600, 1800, 3, NULL, NULL, NULL, NULL),
(8, 9, 2, 4, 60, 120960, 0, 8, 9, 7, 2016),
(9, 10, 1, 2, 59.98, 86371.2, 2, 8, 9, 10, 1440),
(10, 11, 2, 5, 30, 67500, 5, 10, 5, 9, 2250);

-- --------------------------------------------------------

--
-- Table structure for table `purchase_payments`
--

CREATE TABLE `purchase_payments` (
  `id` int(11) NOT NULL,
  `po_id` int(11) NOT NULL,
  `amount` float NOT NULL,
  `payment_date` date NOT NULL,
  `mode` varchar(20) NOT NULL,
  `reference_no` varchar(60) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchase_payments`
--

INSERT INTO `purchase_payments` (`id`, `po_id`, `amount`, `payment_date`, `mode`, `reference_no`, `remarks`, `created_by`, `created_at`) VALUES
(1, 4, 10800, '2026-03-11', 'cash', NULL, NULL, 1, '2026-03-11 22:54:21'),
(2, 6, 25200, '2026-03-11', 'cash', NULL, NULL, 1, '2026-03-11 23:13:03'),
(3, 7, 74000, '2026-03-12', 'cash', NULL, NULL, 1, '2026-03-12 23:10:08'),
(4, 8, 181800, '2026-03-13', 'cash', NULL, NULL, 1, '2026-03-13 09:09:08'),
(5, 10, 86371.2, '2026-03-17', 'cash', NULL, NULL, 1, '2026-03-17 22:25:38');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_receipts`
--

CREATE TABLE `purchase_receipts` (
  `id` int(11) NOT NULL,
  `po_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `receipt_date` date NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchase_receipts`
--

INSERT INTO `purchase_receipts` (`id`, `po_id`, `warehouse_id`, `receipt_date`, `remarks`, `created_by`, `created_at`) VALUES
(1, 4, 1, '2026-03-11', NULL, 1, '2026-03-11 22:44:21'),
(2, 6, 1, '2026-03-11', NULL, 1, '2026-03-11 23:12:46'),
(3, 7, 1, '2026-03-12', NULL, 1, '2026-03-12 23:08:11'),
(4, 8, 2, '2026-03-13', NULL, 1, '2026-03-13 09:08:40'),
(5, 10, 1, '2026-03-17', NULL, 1, '2026-03-17 22:24:50'),
(7, 11, 1, '2026-03-17', NULL, 1, '2026-03-17 23:22:57');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_receipt_items`
--

CREATE TABLE `purchase_receipt_items` (
  `id` int(11) NOT NULL,
  `receipt_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `received_qty` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchase_receipt_items`
--

INSERT INTO `purchase_receipt_items` (`id`, `receipt_id`, `item_id`, `received_qty`) VALUES
(1, 1, 2, 3),
(2, 2, 1, 4),
(3, 3, 2, 5),
(4, 3, 4, 4),
(5, 4, 1, 2),
(6, 4, 3, 3),
(7, 5, 1, 2),
(8, 7, 2, 5);

-- --------------------------------------------------------

--
-- Table structure for table `purchase_returns`
--

CREATE TABLE `purchase_returns` (
  `id` int(11) NOT NULL,
  `receipt_id` int(11) NOT NULL,
  `po_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_return_items`
--

CREATE TABLE `purchase_return_items` (
  `id` int(11) NOT NULL,
  `return_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `qty` float NOT NULL,
  `reason` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_invoices`
--

CREATE TABLE `sales_invoices` (
  `id` int(11) NOT NULL,
  `invoice_no` varchar(60) NOT NULL,
  `project_id` int(11) NOT NULL,
  `milestone_id` int(11) DEFAULT NULL,
  `invoice_date` date NOT NULL,
  `client_name` varchar(120) DEFAULT NULL,
  `client_gstin` varchar(20) DEFAULT NULL,
  `from_state` varchar(60) DEFAULT NULL,
  `to_state` varchar(60) DEFAULT NULL,
  `is_interstate` tinyint(1) DEFAULT NULL,
  `taxable_amount` float NOT NULL,
  `cgst_rate` float DEFAULT NULL,
  `cgst_amount` float DEFAULT NULL,
  `sgst_rate` float DEFAULT NULL,
  `sgst_amount` float DEFAULT NULL,
  `igst_rate` float DEFAULT NULL,
  `igst_amount` float DEFAULT NULL,
  `total_tax` float DEFAULT NULL,
  `gross_amount` float NOT NULL,
  `advance_adjustment` float DEFAULT NULL,
  `net_payable` float NOT NULL,
  `is_reverse_charge` tinyint(1) DEFAULT NULL,
  `payment_status` varchar(30) DEFAULT NULL,
  `paid_amount` float DEFAULT NULL,
  `paid_date` date DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sales_invoices`
--

INSERT INTO `sales_invoices` (`id`, `invoice_no`, `project_id`, `milestone_id`, `invoice_date`, `client_name`, `client_gstin`, `from_state`, `to_state`, `is_interstate`, `taxable_amount`, `cgst_rate`, `cgst_amount`, `sgst_rate`, `sgst_amount`, `igst_rate`, `igst_amount`, `total_tax`, `gross_amount`, `advance_adjustment`, `net_payable`, `is_reverse_charge`, `payment_status`, `paid_amount`, `paid_date`, `is_deleted`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'INV-STP-2024-001', 2, 3, '2024-07-15', 'Shri Pushkar Devasthan Trust', '08AAABT1234A1ZB', 'Rajasthan', 'Rajasthan', 0, 1875000, 9, 168750, 9, 168750, 0, 0, 337500, 2212500, 500000, 1712500, 0, 'paid', 1712500, '2024-07-30', 0, 6, '2026-03-09 08:24:45', '2026-03-09 08:24:45'),
(2, 'INV-DMM-2024-001', 3, 7, '2024-10-10', 'Mata Durga Seva Samiti', '24BBBCS5678B2ZC', 'Rajasthan', 'Gujarat', 1, 1312500, 0, 0, 0, 0, 18, 236250, 236250, 1548750, 200000, 1348750, 0, 'partial', 800000, NULL, 0, 6, '2026-03-09 08:24:45', '2026-03-09 08:24:45');

-- --------------------------------------------------------

--
-- Table structure for table `scrap_entries`
--

CREATE TABLE `scrap_entries` (
  `id` int(11) NOT NULL,
  `item_id` int(11) DEFAULT NULL,
  `stone_block_id` int(11) DEFAULT NULL,
  `warehouse_id` int(11) NOT NULL,
  `qty` float NOT NULL,
  `reason` varchar(30) NOT NULL,
  `source_type` varchar(60) DEFAULT NULL,
  `source_id` int(11) DEFAULT NULL,
  `stage_id` int(11) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `scrap_entries`
--

INSERT INTO `scrap_entries` (`id`, `item_id`, `stone_block_id`, `warehouse_id`, `qty`, `reason`, `source_type`, `source_id`, `stage_id`, `remarks`, `created_by`, `created_at`) VALUES
(1, 2, 5, 1, 10, 'process_loss', 'position_stage', 1, 1, NULL, 1, '2026-03-18 22:58:31');

-- --------------------------------------------------------

--
-- Table structure for table `stage_master`
--

CREATE TABLE `stage_master` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stage_master`
--

INSERT INTO `stage_master` (`id`, `name`, `description`, `is_deleted`, `created_at`) VALUES
(1, 'Cutting', 'Initial cutting', NULL, NULL),
(2, 'Carving', NULL, 0, '2026-03-13 22:45:50'),
(3, 'Polishing', NULL, 0, '2026-03-17 13:14:32');

-- --------------------------------------------------------

--
-- Table structure for table `stock_ledger`
--

CREATE TABLE `stock_ledger` (
  `id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `movement_type` varchar(30) NOT NULL,
  `qty_in` float DEFAULT NULL,
  `qty_out` float DEFAULT NULL,
  `balance_qty` float NOT NULL,
  `rate` float DEFAULT NULL,
  `value` float DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `serial_no` varchar(60) DEFAULT NULL,
  `batch_no` varchar(60) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `stock_ledger`
--

INSERT INTO `stock_ledger` (`id`, `item_id`, `warehouse_id`, `movement_type`, `qty_in`, `qty_out`, `balance_qty`, `rate`, `value`, `reference_type`, `reference_id`, `serial_no`, `batch_no`, `remarks`, `created_by`, `created_at`) VALUES
(1, 1, 1, 'inward', 200, 0, 200, 1800, 360000, 'purchase', NULL, NULL, NULL, 'Initial purchase - WMM batch', 5, '2026-03-09 08:24:44'),
(2, 2, 1, 'inward', 80, 0, 80, 2200, 176000, 'purchase', NULL, NULL, NULL, 'Black granite - first lot', 5, '2026-03-09 08:24:44'),
(3, 3, 1, 'inward', 5, 0, 5, 12000, 60000, 'purchase', NULL, NULL, NULL, 'Pneumatic chisel sets', 5, '2026-03-09 08:24:44'),
(4, 4, 1, 'inward', 50, 0, 50, 450, 22500, 'purchase', NULL, NULL, NULL, 'Polishing compound stock', 5, '2026-03-09 08:24:44'),
(5, 5, 1, 'inward', 500, 0, 500, 35, 17500, 'purchase', NULL, NULL, NULL, 'Anchor bolts - SS M12', 5, '2026-03-09 08:24:44'),
(6, 5, 1, 'site_dispatch', 0, 120, 380, 35, 4200, 'dispatch', NULL, NULL, NULL, 'Sent to Pushkar site', 5, '2026-03-09 08:24:44'),
(7, 2, 1, 'inward', 3, 0, 83, 60, 21600, 'purchase_order', 5, NULL, NULL, 'PO Receipt: PO-GEN-2026-005', 1, '2026-03-11 22:26:23'),
(8, 2, 1, 'inward', 3, 0, 86, 60, 10800, 'purchase_order', 4, NULL, NULL, 'PO Receipt: PO-GEN-2026-001', 1, '2026-03-11 22:44:21'),
(9, 1, 1, 'inward', 4, 0, 204, 30, 25200, 'purchase_order', 6, NULL, NULL, 'PO Receipt: PO-GEN-2026-005', 1, '2026-03-11 23:12:46'),
(10, 2, 1, 'inward', 5, 0, 91, 60, 72000, 'purchase_order', 7, NULL, NULL, 'PO Receipt: PO-GEN-2026-007', 1, '2026-03-12 23:08:11'),
(11, 4, 1, 'inward', 4, 0, 54, 500, 2000, 'purchase_order', 7, NULL, NULL, 'PO Receipt: PO-GEN-2026-007', 1, '2026-03-12 23:08:11'),
(12, 1, 2, 'inward', 1, 0, 1, 30, 90000, 'purchase_order', 8, 'SB-5A11DA27AE', NULL, 'PO Receipt: PO-GEN-2026-008', 1, '2026-03-13 09:08:40'),
(13, 1, 2, 'inward', 1, 0, 2, 30, 90000, 'purchase_order', 8, 'SB-F79BA6FE3C', NULL, 'PO Receipt: PO-GEN-2026-008', 1, '2026-03-13 09:08:40'),
(14, 3, 2, 'inward', 1, 0, 1, 600, 600, 'purchase_order', 8, 'TOOL-PCH-001-SN-226C83BD', NULL, 'PO Receipt: PO-GEN-2026-008', 1, '2026-03-13 09:08:40'),
(15, 3, 2, 'inward', 1, 0, 2, 600, 600, 'purchase_order', 8, 'TOOL-PCH-001-SN-A12B29E0', NULL, 'PO Receipt: PO-GEN-2026-008', 1, '2026-03-13 09:08:40'),
(16, 3, 2, 'inward', 1, 0, 3, 600, 600, 'purchase_order', 8, 'TOOL-PCH-001-SN-90131CE8', NULL, 'PO Receipt: PO-GEN-2026-008', 1, '2026-03-13 09:08:40'),
(17, 1, 1, 'inward', 1, 0, 205, 59.98, 43185.6, 'purchase_order', 10, 'SB-CD649E86EF', NULL, 'PO Receipt: PO-GEN-2026-010', 1, '2026-03-17 22:24:50'),
(18, 1, 1, 'inward', 1, 0, 206, 59.98, 43185.6, 'purchase_order', 10, 'SB-0A7EE5849B', NULL, 'PO Receipt: PO-GEN-2026-010', 1, '2026-03-17 22:24:50'),
(19, 2, 1, 'inward', 1, 0, 92, 30, 13500, 'purchase_order', 11, 'SB-F3945A43B8', NULL, 'PO Receipt: PO-GEN-2026-011', 1, '2026-03-17 23:22:57'),
(20, 2, 1, 'inward', 1, 0, 93, 30, 13500, 'purchase_order', 11, 'SB-F62771D248', NULL, 'PO Receipt: PO-GEN-2026-011', 1, '2026-03-17 23:22:57'),
(21, 2, 1, 'inward', 1, 0, 94, 30, 13500, 'purchase_order', 11, 'SB-08666D3441', NULL, 'PO Receipt: PO-GEN-2026-011', 1, '2026-03-17 23:22:57'),
(22, 2, 1, 'inward', 1, 0, 95, 30, 13500, 'purchase_order', 11, 'SB-1B951138AD', NULL, 'PO Receipt: PO-GEN-2026-011', 1, '2026-03-17 23:22:57'),
(23, 2, 1, 'inward', 1, 0, 96, 30, 13500, 'purchase_order', 11, 'SB-FC12603F4D', NULL, 'PO Receipt: PO-GEN-2026-011', 1, '2026-03-17 23:22:57'),
(24, 2, 1, 'outward', 0, 10, 86, 2200, 22000, 'scrap', 1, 'BLK-2024-004', NULL, 'Scrap', 1, '2026-03-18 22:58:31'),
(25, 7, 4, 'inward', 1, 0, 1, 0, 0, 'idol_stock_place', 5, 'IDOL-11DB79E2', NULL, 'Placed completed idol IDOL-11DB79E2 in stock', 1, '2026-03-19 09:58:00'),
(26, 7, 4, 'outward', 0, 1, 0, 0, 0, 'idol_sale', 5, 'IDOL-11DB79E2', NULL, 'Sold idol IDOL-11DB79E2', 1, '2026-03-19 09:59:25');

-- --------------------------------------------------------

--
-- Table structure for table `stock_transfers`
--

CREATE TABLE `stock_transfers` (
  `id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `from_warehouse_id` int(11) NOT NULL,
  `to_warehouse_id` int(11) NOT NULL,
  `qty` float NOT NULL,
  `serial_no` varchar(60) DEFAULT NULL,
  `transfer_date` date DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `transferred_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stone_blocks`
--

CREATE TABLE `stone_blocks` (
  `id` int(11) NOT NULL,
  `serial_no` varchar(60) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `item_id` int(11) DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `project_id` int(11) DEFAULT NULL,
  `length` float NOT NULL,
  `width` float NOT NULL,
  `height` float NOT NULL,
  `total_volume` float NOT NULL,
  `available_volume` float NOT NULL,
  `yield_pct` float DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  `stone_type` varchar(60) DEFAULT NULL,
  `quarry_source` varchar(120) DEFAULT NULL,
  `rate_per_cft` float DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `stone_blocks`
--

INSERT INTO `stone_blocks` (`id`, `serial_no`, `parent_id`, `item_id`, `warehouse_id`, `project_id`, `length`, `width`, `height`, `total_volume`, `available_volume`, `yield_pct`, `status`, `stone_type`, `quarry_source`, `rate_per_cft`, `is_deleted`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'BLK-2024-001', NULL, 1, 1, 2, 6, 4, 3, 72, 72, 100, 'available', 'White Makrana', 'Makrana Mines, Nagaur', 1800, 0, 5, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(2, 'BLK-2024-002', NULL, 1, 1, 2, 5, 3.5, 2.5, 43.75, 43.75, 100, 'available', 'White Makrana', 'Makrana Mines, Nagaur', 1800, 0, 5, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(3, 'BLK-2024-003', NULL, 1, 1, 2, 4, 4, 4, 64, 50, 100, 'split', 'White Makrana', 'Makrana Mines, Nagaur', 1800, 0, 5, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(4, 'BLK-2024-003A', 3, 1, 1, 2, 2, 4, 4, 32, 32, 100, 'allocated', 'White Makrana', 'Makrana Mines, Nagaur', 1800, 0, 5, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(5, 'BLK-2024-004', NULL, 2, 1, 2, 5, 3, 2, 30, 20, 100, 'allocated', 'Black Granite', 'Rajasthan Granite Quarry', 2200, 0, 5, '2026-03-09 08:24:44', '2026-03-18 22:58:31'),
(6, 'BLK-2024-005', NULL, 1, 2, 2, 3, 2.5, 2, 15, 15, 100, 'dispatched', 'White Makrana', 'Makrana Mines, Nagaur', 1800, 0, 5, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(7, 'BLK-2024-006', NULL, 1, 1, 2, 2.5, 2, 1.5, 7.5, 7.5, 100, 'available', 'Pink Sandstone', 'Dholpur Mines', 950, 0, 5, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(11, 'SB-1A21EFD56F', NULL, 2, 1, NULL, 4, 5, 3, 60, 60, 100, 'available', NULL, NULL, 60, 0, 1, '2026-03-11 22:44:21', '2026-03-11 22:44:21'),
(12, 'SB-E1A3820DF3', NULL, 2, 1, 2, 4, 5, 3, 60, 60, 100, 'allocated', NULL, NULL, 60, 0, 1, '2026-03-11 22:44:21', '2026-03-17 23:55:17'),
(13, 'SB-0B11416FD0', NULL, 2, 1, NULL, 4, 5, 3, 60, 48, 20, 'split', NULL, NULL, 60, 0, 1, '2026-03-11 22:44:21', '2026-03-18 11:28:46'),
(14, 'SB-24DBF3B841', NULL, 1, 1, 1, 5, 6, 7, 210, 210, 100, 'allocated', NULL, NULL, 30, 0, 1, '2026-03-11 23:12:46', '2026-03-12 19:00:50'),
(15, 'SB-0AA79D0CAD', NULL, 1, 1, 1, 5, 6, 7, 210, 210, 100, 'allocated', NULL, NULL, 30, 0, 1, '2026-03-11 23:12:46', '2026-03-12 18:08:20'),
(16, 'SB-591E3D3144', NULL, 1, 1, 4, 5, 6, 7, 210, 210, 100, 'allocated', NULL, NULL, 30, 0, 1, '2026-03-11 23:12:47', '2026-03-13 19:56:37'),
(17, 'SB-62C044FA79', NULL, 1, 1, 4, 5, 6, 7, 210, 210, 100, 'allocated', NULL, NULL, 30, 0, 1, '2026-03-11 23:12:47', '2026-03-13 19:56:37'),
(18, 'SB-6F55F1D5C1', NULL, 2, 1, 2, 5, 6, 8, 240, 240, 100, 'allocated', NULL, NULL, 60, 0, 1, '2026-03-12 23:08:11', '2026-03-19 16:17:31'),
(19, 'SB-34D67833EE', NULL, 2, 1, NULL, 5, 6, 8, 240, 240, 100, 'available', NULL, NULL, 60, 0, 1, '2026-03-12 23:08:11', '2026-03-12 23:08:11'),
(20, 'SB-96B157CDD4', NULL, 2, 1, NULL, 5, 6, 8, 240, 240, 100, 'available', NULL, NULL, 60, 0, 1, '2026-03-12 23:08:11', '2026-03-12 23:08:11'),
(21, 'SB-3A3AFD8B62', NULL, 2, 1, 2, 5, 6, 8, 240, 240, 100, 'allocated', NULL, NULL, 60, 0, 1, '2026-03-12 23:08:12', '2026-03-18 14:08:47'),
(22, 'SB-3FF73D5F77', NULL, 2, 1, NULL, 5, 6, 8, 240, 240, 100, 'available', NULL, NULL, 60, 0, 1, '2026-03-12 23:08:12', '2026-03-12 23:08:12'),
(23, 'SB-5A11DA27AE', NULL, 1, 2, NULL, 15, 20, 10, 3000, 3000, 100, 'available', NULL, NULL, 30, 0, 1, '2026-03-13 09:08:40', '2026-03-13 15:08:25'),
(24, 'SB-F79BA6FE3C', NULL, 1, 2, NULL, 15, 20, 10, 3000, 3000, 100, 'available', NULL, NULL, 30, 0, 1, '2026-03-13 09:08:40', '2026-03-13 15:08:25'),
(25, 'SB-CD649E86EF', NULL, 1, 1, NULL, 8, 9, 10, 720, 720, 100, 'available', NULL, NULL, 59.98, 0, 1, '2026-03-17 22:24:50', '2026-03-17 22:24:50'),
(26, 'SB-0A7EE5849B', NULL, 1, 1, NULL, 8, 9, 10, 720, 720, 100, 'available', NULL, NULL, 59.98, 0, 1, '2026-03-17 22:24:50', '2026-03-17 22:24:50'),
(27, 'SB-F3945A43B8', NULL, 2, 1, 2, 10, 5, 9, 450, 450, 100, 'allocated', NULL, NULL, 30, 0, 1, '2026-03-17 23:22:57', '2026-03-17 23:55:40'),
(28, 'SB-F62771D248', NULL, 2, 1, NULL, 10, 5, 9, 450, 450, 100, 'available', NULL, NULL, 30, 0, 1, '2026-03-17 23:22:57', '2026-03-17 23:22:57'),
(29, 'SB-08666D3441', NULL, 2, 1, NULL, 10, 5, 9, 450, 450, 100, 'available', NULL, NULL, 30, 0, 1, '2026-03-17 23:22:57', '2026-03-17 23:22:57'),
(30, 'SB-1B951138AD', NULL, 2, 1, NULL, 10, 5, 9, 450, 450, 100, 'available', NULL, NULL, 30, 0, 1, '2026-03-17 23:22:57', '2026-03-17 23:22:57'),
(31, 'SB-FC12603F4D', NULL, 2, 1, NULL, 10, 5, 9, 450, 450, 100, 'available', NULL, NULL, 30, 0, 1, '2026-03-17 23:22:57', '2026-03-17 23:22:57'),
(32, 'SB-C3B4BC5F7E', 13, 2, 1, NULL, 2, 3, 2, 12, 12, 100, 'available', NULL, NULL, 60, 0, 1, '2026-03-18 11:28:46', '2026-03-18 11:28:46');

-- --------------------------------------------------------

--
-- Table structure for table `structural_components`
--

CREATE TABLE `structural_components` (
  `id` int(11) NOT NULL,
  `stone_block_id` int(11) NOT NULL,
  `position_id` int(11) NOT NULL,
  `project_id` int(11) DEFAULT NULL,
  `actual_length` float DEFAULT NULL,
  `actual_width` float DEFAULT NULL,
  `actual_height` float DEFAULT NULL,
  `is_dimension_compliant` tinyint(1) DEFAULT NULL,
  `wip_status` varchar(30) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `cost` float DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `structural_components`
--

INSERT INTO `structural_components` (`id`, `stone_block_id`, `position_id`, `project_id`, `actual_length`, `actual_width`, `actual_height`, `is_dimension_compliant`, `wip_status`, `remarks`, `is_deleted`, `created_at`, `updated_at`, `cost`) VALUES
(1, 4, 1, 2, 4.05, 3.98, 1.48, 1, 'completed', 'Within 3% tolerance - approved', 0, '2026-03-09 08:24:45', '2026-03-18 22:58:49', 7400),
(2, 6, 9, 2, 0.61, 0.6, 3.52, 1, 'completed', 'Pillar 1 fabricated and installed', 0, '2026-03-09 08:24:45', '2026-03-09 08:24:45', 0);

-- --------------------------------------------------------

--
-- Table structure for table `structure_layers`
--

CREATE TABLE `structure_layers` (
  `id` int(11) NOT NULL,
  `structure_type_id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `layer_order` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `structure_layers`
--

INSERT INTO `structure_layers` (`id`, `structure_type_id`, `name`, `layer_order`, `description`, `is_deleted`, `created_at`) VALUES
(1, 1, 'Foundation Plinth', 1, 'Base foundation layer', 0, '2026-03-09 08:24:44'),
(2, 1, 'Base Platform (Pitha)', 2, 'Elevated stone platform', 0, '2026-03-09 08:24:44'),
(3, 1, 'Wall Body (Jangha)', 3, 'Main wall section with carvings', 0, '2026-03-09 08:24:44'),
(4, 1, 'Neck (Griva)', 4, 'Transitional neck section', 0, '2026-03-09 08:24:44'),
(5, 1, 'Crown (Shikhara Top)', 5, 'Topmost crown section', 0, '2026-03-09 08:24:44'),
(6, 2, 'Pillar Set', 1, '16 carved stone pillars', 0, '2026-03-09 08:24:44'),
(7, 2, 'Beam & Lintel', 2, 'Cross beams connecting pillars', 0, '2026-03-09 08:24:44');

-- --------------------------------------------------------

--
-- Table structure for table `structure_types`
--

CREATE TABLE `structure_types` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text DEFAULT NULL,
  `project_id` int(11) DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `structure_types`
--

INSERT INTO `structure_types` (`id`, `name`, `description`, `project_id`, `is_deleted`, `created_at`) VALUES
(1, 'Main Shikhara', 'Primary tower structure of the Shiva temple', 2, 0, '2026-03-09 08:24:44'),
(2, 'Mandapa (Assembly Hall)', 'Pillared assembly hall in front of sanctum', 2, 0, '2026-03-09 08:24:44'),
(3, 'Garbhagriha (Sanctum)', 'Inner sanctum housing the main deity', 2, 0, '2026-03-09 08:24:44');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(150) NOT NULL,
  `hashed_password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `hashed_password`, `role`, `is_active`, `is_deleted`, `created_at`, `updated_at`) VALUES
(1, 'Admin User', 'admin@temple.com', '$2b$12$mfE/Nv4qnv.uXqJPUO13IuMMTuyEmHkoW0t/ZXAd2dHfGA3bzS.tW', 'admin', 1, 0, '2026-03-08 18:34:10', '2026-03-08 18:34:10'),
(2, 'Ramesh Sharma', 'pm@temple.com', '$2b$12$E882llTeY6cHyXwohJHiqOAWt0cpzmfO.JvyMq/tVfjO.uCuS3K4m', 'project_manager', 1, 0, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(3, 'Suresh Verma', 'eng@temple.com', '$2b$12$LSClW1d8pxd8IXnUxpxLKuE9Fbx6wS0laJ0R3R/eNvo5UGObS9fM6', 'structural_engineer', 1, 0, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(4, 'Mahesh Patel', 'prod@temple.com', '$2b$12$3/A.NK5mFFqqg9jKRhsf/eXirSxfhdcVSc1ybaxLfG81Rm.cTTZ7y', 'production_supervisor', 1, 0, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(5, 'Dinesh Gupta', 'store@temple.com', '$2b$12$a9pslbM4AawvM3FvlUglPOhglyZGC1hvA1trxlDuq/7RIKSg/jfGK', 'store_manager', 1, 0, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(6, 'Neha Joshi', 'accounts@temple.com', '$2b$12$w8sY9D6p1gH8vmbyUr6biO9rvbMYkAKkD3pe9zPYg0McXQWYzlCfG', 'accounts_manager', 1, 0, '2026-03-09 08:24:44', '2026-03-09 08:24:44'),
(7, 'Rajesh Kumar', 'site@temple.com', '$2b$12$Vx.cPaxsw83mSX3AKSEs5eOyYK76S66DtedW4LHALbmAUqP//fV8K', 'site_supervisor', 1, 0, '2026-03-09 08:24:44', '2026-03-09 08:24:44');

-- --------------------------------------------------------

--
-- Table structure for table `vendors`
--

CREATE TABLE `vendors` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `pan` varchar(10) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `state` varchar(60) DEFAULT NULL,
  `state_code` varchar(5) DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vendors`
--

INSERT INTO `vendors` (`id`, `name`, `gstin`, `pan`, `phone`, `email`, `address`, `state`, `state_code`, `is_deleted`, `created_at`, `updated_at`) VALUES
(1, 'Akshay MAske', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-03-17 22:15:33', '2026-03-17 22:15:33');

-- --------------------------------------------------------

--
-- Table structure for table `warehouses`
--

CREATE TABLE `warehouses` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `code` varchar(30) NOT NULL,
  `warehouse_type` varchar(30) DEFAULT NULL,
  `project_id` int(11) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `state_code` varchar(5) DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `warehouses`
--

INSERT INTO `warehouses` (`id`, `name`, `code`, `warehouse_type`, `project_id`, `address`, `gstin`, `state_code`, `is_deleted`, `created_at`) VALUES
(1, 'Main Workshop - Jaipur', 'WH-MAIN', 'main', NULL, 'Plot 45, RIICO Industrial Area, Jaipur, Rajasthan 302013', '08AABCM1234A1ZZ', '08', 0, '2026-03-09 08:24:44'),
(2, 'Pushkar Site Store', 'WH-STP001', 'site', 2, 'Temple Site, Pushkar, Ajmer, Rajasthan 305022', NULL, '08', 0, '2026-03-09 08:24:44'),
(3, 'Ahmedabad Site Store', 'WH-DMM002', 'site', 3, 'Sector 12, Gandhinagar Road, Ahmedabad, Gujarat 380015', NULL, '24', 0, '2026-03-09 08:24:44'),
(4, 'Job Work Store - Makrana', 'WH-JW01', 'job_work', NULL, 'Makrana, Nagaur, Rajasthan 341505', NULL, '08', 0, '2026-03-09 08:24:44'),
(5, 'TEST', 'Test-01', 'site', NULL, 'TEST', NULL, '05', 0, '2026-03-17 22:39:46');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `advance_payments`
--
ALTER TABLE `advance_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `ix_advance_payments_id` (`id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `ix_audit_logs_id` (`id`);

--
-- Indexes for table `block_allocations`
--
ALTER TABLE `block_allocations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `stone_block_id` (`stone_block_id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `allocated_by` (`allocated_by`),
  ADD KEY `ix_block_allocations_id` (`id`);

--
-- Indexes for table `blueprint_positions`
--
ALTER TABLE `blueprint_positions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `layer_id` (`layer_id`),
  ADD KEY `ix_blueprint_positions_id` (`id`),
  ADD KEY `fk_blueprint_positions_stone_item` (`stone_item_id`);

--
-- Indexes for table `contractors`
--
ALTER TABLE `contractors`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_contractors_id` (`id`);

--
-- Indexes for table `contractor_agreements`
--
ALTER TABLE `contractor_agreements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `agreement_no` (`agreement_no`),
  ADD KEY `contractor_id` (`contractor_id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `ix_contractor_agreements_id` (`id`);

--
-- Indexes for table `contractor_invoices`
--
ALTER TABLE `contractor_invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_no` (`invoice_no`),
  ADD KEY `agreement_id` (`agreement_id`),
  ADD KEY `milestone_id` (`milestone_id`),
  ADD KEY `ix_contractor_invoices_id` (`id`);

--
-- Indexes for table `dispatches`
--
ALTER TABLE `dispatches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `dispatch_note_no` (`dispatch_note_no`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `from_warehouse_id` (`from_warehouse_id`),
  ADD KEY `to_warehouse_id` (`to_warehouse_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_dispatches_id` (`id`);

--
-- Indexes for table `dispatch_items`
--
ALTER TABLE `dispatch_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `dispatch_id` (`dispatch_id`),
  ADD KEY `stone_block_id` (`stone_block_id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `ix_dispatch_items_id` (`id`);

--
-- Indexes for table `dispatch_item_serials`
--
ALTER TABLE `dispatch_item_serials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_dispatch_item_serials_dispatch_item_id` (`dispatch_item_id`),
  ADD KEY `ix_dispatch_item_serials_id` (`id`),
  ADD KEY `ix_dispatch_item_serials_serial_id` (`serial_id`);

--
-- Indexes for table `dispatch_workflows`
--
ALTER TABLE `dispatch_workflows`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ix_dispatch_workflows_dispatch_id` (`dispatch_id`),
  ADD KEY `confirmed_by` (`confirmed_by`),
  ADD KEY `ix_dispatch_workflows_id` (`id`);

--
-- Indexes for table `idol_manufacturing`
--
ALTER TABLE `idol_manufacturing`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `serial_no` (`serial_no`),
  ADD KEY `stone_block_id` (`stone_block_id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_idol_manufacturing_id` (`id`);

--
-- Indexes for table `idol_materials`
--
ALTER TABLE `idol_materials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idol_id` (`idol_id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `stone_block_id` (`stone_block_id`),
  ADD KEY `ix_idol_materials_id` (`id`);

--
-- Indexes for table `idol_sales`
--
ALTER TABLE `idol_sales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ix_idol_sales_idol_id` (`idol_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_idol_sales_id` (`id`);

--
-- Indexes for table `idol_stock_movements`
--
ALTER TABLE `idol_stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_idol_stock_movements_idol_id` (`idol_id`),
  ADD KEY `ix_idol_stock_movements_id` (`id`);

--
-- Indexes for table `installations`
--
ALTER TABLE `installations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stone_block_id` (`stone_block_id`),
  ADD KEY `position_id` (`position_id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `installed_by` (`installed_by`),
  ADD KEY `verified_by` (`verified_by`),
  ADD KEY `ix_installations_id` (`id`);

--
-- Indexes for table `installation_photos`
--
ALTER TABLE `installation_photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `installation_id` (`installation_id`),
  ADD KEY `uploaded_by` (`uploaded_by`),
  ADD KEY `ix_installation_photos_id` (`id`);

--
-- Indexes for table `invoice_dispatch_allocations`
--
ALTER TABLE `invoice_dispatch_allocations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_invoice_dispatch_allocations_dispatch_item_id` (`dispatch_item_id`),
  ADD KEY `ix_invoice_dispatch_allocations_invoice_id` (`invoice_id`),
  ADD KEY `ix_invoice_dispatch_allocations_id` (`id`),
  ADD KEY `ix_invoice_dispatch_allocations_dispatch_id` (`dispatch_id`);

--
-- Indexes for table `invoice_line_items`
--
ALTER TABLE `invoice_line_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `invoice_id` (`invoice_id`),
  ADD KEY `ix_invoice_line_items_id` (`id`);

--
-- Indexes for table `invoice_workflows`
--
ALTER TABLE `invoice_workflows`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ix_invoice_workflows_invoice_id` (`invoice_id`),
  ADD KEY `issued_by` (`issued_by`),
  ADD KEY `ix_invoice_workflows_id` (`id`);

--
-- Indexes for table `items`
--
ALTER TABLE `items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ix_items_code` (`code`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `ix_items_id` (`id`);

--
-- Indexes for table `item_categories`
--
ALTER TABLE `item_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `ix_item_categories_id` (`id`);

--
-- Indexes for table `item_reservations`
--
ALTER TABLE `item_reservations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_item_reservations_id` (`id`);

--
-- Indexes for table `item_serials`
--
ALTER TABLE `item_serials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ix_item_serials_serial_no` (`serial_no`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `ix_item_serials_id` (`id`);

--
-- Indexes for table `job_works`
--
ALTER TABLE `job_works`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `challan_no` (`challan_no`),
  ADD KEY `stone_block_id` (`stone_block_id`),
  ADD KEY `from_warehouse_id` (`from_warehouse_id`),
  ADD KEY `job_work_warehouse_id` (`job_work_warehouse_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_job_works_id` (`id`);

--
-- Indexes for table `manufacturing_photos`
--
ALTER TABLE `manufacturing_photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idol_id` (`idol_id`),
  ADD KEY `stage_id` (`stage_id`),
  ADD KEY `uploaded_by` (`uploaded_by`),
  ADD KEY `ix_manufacturing_photos_id` (`id`);

--
-- Indexes for table `manufacturing_stages`
--
ALTER TABLE `manufacturing_stages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idol_id` (`idol_id`),
  ADD KEY `ix_manufacturing_stages_id` (`id`);

--
-- Indexes for table `milestones`
--
ALTER TABLE `milestones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `ix_milestones_id` (`id`);

--
-- Indexes for table `position_dependencies`
--
ALTER TABLE `position_dependencies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `position_id` (`position_id`,`depends_on_id`),
  ADD KEY `depends_on_id` (`depends_on_id`),
  ADD KEY `ix_position_dependencies_id` (`id`);

--
-- Indexes for table `position_stages`
--
ALTER TABLE `position_stages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_position_stage` (`position_id`,`stage_id`),
  ADD KEY `fk_position_stages_stage` (`stage_id`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_projects_id` (`id`);

--
-- Indexes for table `project_costs`
--
ALTER TABLE `project_costs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_project_costs_id` (`id`);

--
-- Indexes for table `project_materials`
--
ALTER TABLE `project_materials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `stone_block_id` (`stone_block_id`),
  ADD KEY `ix_project_materials_id` (`id`);

--
-- Indexes for table `project_material_serials`
--
ALTER TABLE `project_material_serials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_material_id` (`project_material_id`),
  ADD KEY `item_serial_id` (`item_serial_id`),
  ADD KEY `ix_project_material_serials_id` (`id`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `po_number` (`po_number`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_purchase_orders_id` (`id`),
  ADD KEY `fk_purchase_orders_vendor` (`vendor_id`);

--
-- Indexes for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `po_id` (`po_id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `ix_purchase_order_items_id` (`id`);

--
-- Indexes for table `purchase_payments`
--
ALTER TABLE `purchase_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `po_id` (`po_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_purchase_payments_id` (`id`);

--
-- Indexes for table `purchase_receipts`
--
ALTER TABLE `purchase_receipts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `po_id` (`po_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_purchase_receipts_id` (`id`);

--
-- Indexes for table `purchase_receipt_items`
--
ALTER TABLE `purchase_receipt_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `receipt_id` (`receipt_id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `ix_purchase_receipt_items_id` (`id`);

--
-- Indexes for table `purchase_returns`
--
ALTER TABLE `purchase_returns`
  ADD PRIMARY KEY (`id`),
  ADD KEY `receipt_id` (`receipt_id`),
  ADD KEY `po_id` (`po_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_purchase_returns_id` (`id`);

--
-- Indexes for table `purchase_return_items`
--
ALTER TABLE `purchase_return_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `return_id` (`return_id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `ix_purchase_return_items_id` (`id`);

--
-- Indexes for table `sales_invoices`
--
ALTER TABLE `sales_invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_no` (`invoice_no`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `milestone_id` (`milestone_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_sales_invoices_id` (`id`);

--
-- Indexes for table `scrap_entries`
--
ALTER TABLE `scrap_entries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `stone_block_id` (`stone_block_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_scrap_entries_id` (`id`);

--
-- Indexes for table `stage_master`
--
ALTER TABLE `stage_master`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `ix_blueprint_stages_id` (`id`);

--
-- Indexes for table `stock_ledger`
--
ALTER TABLE `stock_ledger`
  ADD PRIMARY KEY (`id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_stock_ledger_id` (`id`);

--
-- Indexes for table `stock_transfers`
--
ALTER TABLE `stock_transfers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `from_warehouse_id` (`from_warehouse_id`),
  ADD KEY `to_warehouse_id` (`to_warehouse_id`),
  ADD KEY `transferred_by` (`transferred_by`),
  ADD KEY `ix_stock_transfers_id` (`id`);

--
-- Indexes for table `stone_blocks`
--
ALTER TABLE `stone_blocks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ix_stone_blocks_serial_no` (`serial_no`),
  ADD KEY `parent_id` (`parent_id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `ix_stone_blocks_id` (`id`);

--
-- Indexes for table `structural_components`
--
ALTER TABLE `structural_components`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stone_block_id` (`stone_block_id`),
  ADD KEY `position_id` (`position_id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `ix_structural_components_id` (`id`);

--
-- Indexes for table `structure_layers`
--
ALTER TABLE `structure_layers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `structure_type_id` (`structure_type_id`),
  ADD KEY `ix_structure_layers_id` (`id`);

--
-- Indexes for table `structure_types`
--
ALTER TABLE `structure_types`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `ix_structure_types_id` (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ix_users_email` (`email`),
  ADD KEY `ix_users_id` (`id`);

--
-- Indexes for table `vendors`
--
ALTER TABLE `vendors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `ix_vendors_id` (`id`);

--
-- Indexes for table `warehouses`
--
ALTER TABLE `warehouses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `ix_warehouses_id` (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `advance_payments`
--
ALTER TABLE `advance_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `block_allocations`
--
ALTER TABLE `block_allocations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `blueprint_positions`
--
ALTER TABLE `blueprint_positions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `contractors`
--
ALTER TABLE `contractors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `contractor_agreements`
--
ALTER TABLE `contractor_agreements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `contractor_invoices`
--
ALTER TABLE `contractor_invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `dispatches`
--
ALTER TABLE `dispatches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `dispatch_items`
--
ALTER TABLE `dispatch_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `dispatch_item_serials`
--
ALTER TABLE `dispatch_item_serials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatch_workflows`
--
ALTER TABLE `dispatch_workflows`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `idol_manufacturing`
--
ALTER TABLE `idol_manufacturing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `idol_materials`
--
ALTER TABLE `idol_materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `idol_sales`
--
ALTER TABLE `idol_sales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `idol_stock_movements`
--
ALTER TABLE `idol_stock_movements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `installations`
--
ALTER TABLE `installations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `installation_photos`
--
ALTER TABLE `installation_photos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoice_dispatch_allocations`
--
ALTER TABLE `invoice_dispatch_allocations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoice_line_items`
--
ALTER TABLE `invoice_line_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `invoice_workflows`
--
ALTER TABLE `invoice_workflows`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `items`
--
ALTER TABLE `items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `item_categories`
--
ALTER TABLE `item_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `item_reservations`
--
ALTER TABLE `item_reservations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `item_serials`
--
ALTER TABLE `item_serials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `job_works`
--
ALTER TABLE `job_works`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `manufacturing_photos`
--
ALTER TABLE `manufacturing_photos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `manufacturing_stages`
--
ALTER TABLE `manufacturing_stages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `milestones`
--
ALTER TABLE `milestones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `position_dependencies`
--
ALTER TABLE `position_dependencies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `position_stages`
--
ALTER TABLE `position_stages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `project_costs`
--
ALTER TABLE `project_costs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `project_materials`
--
ALTER TABLE `project_materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT for table `project_material_serials`
--
ALTER TABLE `project_material_serials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `purchase_payments`
--
ALTER TABLE `purchase_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `purchase_receipts`
--
ALTER TABLE `purchase_receipts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `purchase_receipt_items`
--
ALTER TABLE `purchase_receipt_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `purchase_returns`
--
ALTER TABLE `purchase_returns`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_return_items`
--
ALTER TABLE `purchase_return_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_invoices`
--
ALTER TABLE `sales_invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `scrap_entries`
--
ALTER TABLE `scrap_entries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `stage_master`
--
ALTER TABLE `stage_master`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `stock_ledger`
--
ALTER TABLE `stock_ledger`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `stock_transfers`
--
ALTER TABLE `stock_transfers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stone_blocks`
--
ALTER TABLE `stone_blocks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `structural_components`
--
ALTER TABLE `structural_components`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `structure_layers`
--
ALTER TABLE `structure_layers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `structure_types`
--
ALTER TABLE `structure_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `vendors`
--
ALTER TABLE `vendors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `warehouses`
--
ALTER TABLE `warehouses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `advance_payments`
--
ALTER TABLE `advance_payments`
  ADD CONSTRAINT `advance_payments_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`);

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `block_allocations`
--
ALTER TABLE `block_allocations`
  ADD CONSTRAINT `block_allocations_ibfk_1` FOREIGN KEY (`stone_block_id`) REFERENCES `stone_blocks` (`id`),
  ADD CONSTRAINT `block_allocations_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  ADD CONSTRAINT `block_allocations_ibfk_3` FOREIGN KEY (`allocated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `blueprint_positions`
--
ALTER TABLE `blueprint_positions`
  ADD CONSTRAINT `blueprint_positions_ibfk_1` FOREIGN KEY (`layer_id`) REFERENCES `structure_layers` (`id`),
  ADD CONSTRAINT `fk_blueprint_positions_stone_item` FOREIGN KEY (`stone_item_id`) REFERENCES `items` (`id`);

--
-- Constraints for table `contractor_agreements`
--
ALTER TABLE `contractor_agreements`
  ADD CONSTRAINT `contractor_agreements_ibfk_1` FOREIGN KEY (`contractor_id`) REFERENCES `contractors` (`id`),
  ADD CONSTRAINT `contractor_agreements_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`);

--
-- Constraints for table `contractor_invoices`
--
ALTER TABLE `contractor_invoices`
  ADD CONSTRAINT `contractor_invoices_ibfk_1` FOREIGN KEY (`agreement_id`) REFERENCES `contractor_agreements` (`id`),
  ADD CONSTRAINT `contractor_invoices_ibfk_2` FOREIGN KEY (`milestone_id`) REFERENCES `milestones` (`id`);

--
-- Constraints for table `dispatches`
--
ALTER TABLE `dispatches`
  ADD CONSTRAINT `dispatches_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  ADD CONSTRAINT `dispatches_ibfk_2` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `dispatches_ibfk_3` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `dispatches_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `dispatch_items`
--
ALTER TABLE `dispatch_items`
  ADD CONSTRAINT `dispatch_items_ibfk_1` FOREIGN KEY (`dispatch_id`) REFERENCES `dispatches` (`id`),
  ADD CONSTRAINT `dispatch_items_ibfk_2` FOREIGN KEY (`stone_block_id`) REFERENCES `stone_blocks` (`id`),
  ADD CONSTRAINT `dispatch_items_ibfk_3` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`);

--
-- Constraints for table `dispatch_item_serials`
--
ALTER TABLE `dispatch_item_serials`
  ADD CONSTRAINT `dispatch_item_serials_ibfk_1` FOREIGN KEY (`dispatch_item_id`) REFERENCES `dispatch_items` (`id`),
  ADD CONSTRAINT `dispatch_item_serials_ibfk_2` FOREIGN KEY (`serial_id`) REFERENCES `item_serials` (`id`);

--
-- Constraints for table `dispatch_workflows`
--
ALTER TABLE `dispatch_workflows`
  ADD CONSTRAINT `dispatch_workflows_ibfk_1` FOREIGN KEY (`dispatch_id`) REFERENCES `dispatches` (`id`),
  ADD CONSTRAINT `dispatch_workflows_ibfk_2` FOREIGN KEY (`confirmed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `idol_manufacturing`
--
ALTER TABLE `idol_manufacturing`
  ADD CONSTRAINT `idol_manufacturing_ibfk_1` FOREIGN KEY (`stone_block_id`) REFERENCES `stone_blocks` (`id`),
  ADD CONSTRAINT `idol_manufacturing_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  ADD CONSTRAINT `idol_manufacturing_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `idol_materials`
--
ALTER TABLE `idol_materials`
  ADD CONSTRAINT `idol_materials_ibfk_1` FOREIGN KEY (`idol_id`) REFERENCES `idol_manufacturing` (`id`),
  ADD CONSTRAINT `idol_materials_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `idol_materials_ibfk_3` FOREIGN KEY (`stone_block_id`) REFERENCES `stone_blocks` (`id`);

--
-- Constraints for table `idol_sales`
--
ALTER TABLE `idol_sales`
  ADD CONSTRAINT `idol_sales_ibfk_1` FOREIGN KEY (`idol_id`) REFERENCES `idol_manufacturing` (`id`),
  ADD CONSTRAINT `idol_sales_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `idol_sales_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `idol_stock_movements`
--
ALTER TABLE `idol_stock_movements`
  ADD CONSTRAINT `idol_stock_movements_ibfk_1` FOREIGN KEY (`idol_id`) REFERENCES `idol_manufacturing` (`id`),
  ADD CONSTRAINT `idol_stock_movements_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `idol_stock_movements_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `installations`
--
ALTER TABLE `installations`
  ADD CONSTRAINT `installations_ibfk_1` FOREIGN KEY (`stone_block_id`) REFERENCES `stone_blocks` (`id`),
  ADD CONSTRAINT `installations_ibfk_2` FOREIGN KEY (`position_id`) REFERENCES `blueprint_positions` (`id`),
  ADD CONSTRAINT `installations_ibfk_3` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  ADD CONSTRAINT `installations_ibfk_4` FOREIGN KEY (`installed_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `installations_ibfk_5` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `installation_photos`
--
ALTER TABLE `installation_photos`
  ADD CONSTRAINT `installation_photos_ibfk_1` FOREIGN KEY (`installation_id`) REFERENCES `installations` (`id`),
  ADD CONSTRAINT `installation_photos_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `invoice_dispatch_allocations`
--
ALTER TABLE `invoice_dispatch_allocations`
  ADD CONSTRAINT `invoice_dispatch_allocations_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`),
  ADD CONSTRAINT `invoice_dispatch_allocations_ibfk_2` FOREIGN KEY (`dispatch_id`) REFERENCES `dispatches` (`id`),
  ADD CONSTRAINT `invoice_dispatch_allocations_ibfk_3` FOREIGN KEY (`dispatch_item_id`) REFERENCES `dispatch_items` (`id`);

--
-- Constraints for table `invoice_line_items`
--
ALTER TABLE `invoice_line_items`
  ADD CONSTRAINT `invoice_line_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`);

--
-- Constraints for table `invoice_workflows`
--
ALTER TABLE `invoice_workflows`
  ADD CONSTRAINT `invoice_workflows_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`),
  ADD CONSTRAINT `invoice_workflows_ibfk_2` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `items`
--
ALTER TABLE `items`
  ADD CONSTRAINT `items_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `item_categories` (`id`);

--
-- Constraints for table `item_reservations`
--
ALTER TABLE `item_reservations`
  ADD CONSTRAINT `item_reservations_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  ADD CONSTRAINT `item_reservations_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `item_reservations_ibfk_3` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `item_reservations_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `item_serials`
--
ALTER TABLE `item_serials`
  ADD CONSTRAINT `item_serials_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `item_serials_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

--
-- Constraints for table `job_works`
--
ALTER TABLE `job_works`
  ADD CONSTRAINT `job_works_ibfk_1` FOREIGN KEY (`stone_block_id`) REFERENCES `stone_blocks` (`id`),
  ADD CONSTRAINT `job_works_ibfk_2` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `job_works_ibfk_3` FOREIGN KEY (`job_work_warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `job_works_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `manufacturing_photos`
--
ALTER TABLE `manufacturing_photos`
  ADD CONSTRAINT `manufacturing_photos_ibfk_1` FOREIGN KEY (`idol_id`) REFERENCES `idol_manufacturing` (`id`),
  ADD CONSTRAINT `manufacturing_photos_ibfk_2` FOREIGN KEY (`stage_id`) REFERENCES `manufacturing_stages` (`id`),
  ADD CONSTRAINT `manufacturing_photos_ibfk_3` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `manufacturing_stages`
--
ALTER TABLE `manufacturing_stages`
  ADD CONSTRAINT `manufacturing_stages_ibfk_1` FOREIGN KEY (`idol_id`) REFERENCES `idol_manufacturing` (`id`);

--
-- Constraints for table `milestones`
--
ALTER TABLE `milestones`
  ADD CONSTRAINT `milestones_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`);

--
-- Constraints for table `position_dependencies`
--
ALTER TABLE `position_dependencies`
  ADD CONSTRAINT `position_dependencies_ibfk_1` FOREIGN KEY (`position_id`) REFERENCES `blueprint_positions` (`id`),
  ADD CONSTRAINT `position_dependencies_ibfk_2` FOREIGN KEY (`depends_on_id`) REFERENCES `blueprint_positions` (`id`);

--
-- Constraints for table `position_stages`
--
ALTER TABLE `position_stages`
  ADD CONSTRAINT `fk_position_stages_position` FOREIGN KEY (`position_id`) REFERENCES `blueprint_positions` (`id`),
  ADD CONSTRAINT `fk_position_stages_stage` FOREIGN KEY (`stage_id`) REFERENCES `stage_master` (`id`);

--
-- Constraints for table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `project_costs`
--
ALTER TABLE `project_costs`
  ADD CONSTRAINT `project_costs_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  ADD CONSTRAINT `project_costs_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `project_materials`
--
ALTER TABLE `project_materials`
  ADD CONSTRAINT `project_materials_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  ADD CONSTRAINT `project_materials_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `project_materials_ibfk_3` FOREIGN KEY (`stone_block_id`) REFERENCES `stone_blocks` (`id`);

--
-- Constraints for table `project_material_serials`
--
ALTER TABLE `project_material_serials`
  ADD CONSTRAINT `project_material_serials_ibfk_1` FOREIGN KEY (`project_material_id`) REFERENCES `project_materials` (`id`),
  ADD CONSTRAINT `project_material_serials_ibfk_2` FOREIGN KEY (`item_serial_id`) REFERENCES `item_serials` (`id`);

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `fk_purchase_orders_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`),
  ADD CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`),
  ADD CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`);

--
-- Constraints for table `purchase_payments`
--
ALTER TABLE `purchase_payments`
  ADD CONSTRAINT `purchase_payments_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`),
  ADD CONSTRAINT `purchase_payments_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `purchase_receipts`
--
ALTER TABLE `purchase_receipts`
  ADD CONSTRAINT `purchase_receipts_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`),
  ADD CONSTRAINT `purchase_receipts_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `purchase_receipts_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `purchase_receipt_items`
--
ALTER TABLE `purchase_receipt_items`
  ADD CONSTRAINT `purchase_receipt_items_ibfk_1` FOREIGN KEY (`receipt_id`) REFERENCES `purchase_receipts` (`id`),
  ADD CONSTRAINT `purchase_receipt_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`);

--
-- Constraints for table `purchase_returns`
--
ALTER TABLE `purchase_returns`
  ADD CONSTRAINT `purchase_returns_ibfk_1` FOREIGN KEY (`receipt_id`) REFERENCES `purchase_receipts` (`id`),
  ADD CONSTRAINT `purchase_returns_ibfk_2` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`),
  ADD CONSTRAINT `purchase_returns_ibfk_3` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `purchase_returns_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `purchase_return_items`
--
ALTER TABLE `purchase_return_items`
  ADD CONSTRAINT `purchase_return_items_ibfk_1` FOREIGN KEY (`return_id`) REFERENCES `purchase_returns` (`id`),
  ADD CONSTRAINT `purchase_return_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`);

--
-- Constraints for table `sales_invoices`
--
ALTER TABLE `sales_invoices`
  ADD CONSTRAINT `sales_invoices_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  ADD CONSTRAINT `sales_invoices_ibfk_2` FOREIGN KEY (`milestone_id`) REFERENCES `milestones` (`id`),
  ADD CONSTRAINT `sales_invoices_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `scrap_entries`
--
ALTER TABLE `scrap_entries`
  ADD CONSTRAINT `scrap_entries_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `scrap_entries_ibfk_2` FOREIGN KEY (`stone_block_id`) REFERENCES `stone_blocks` (`id`),
  ADD CONSTRAINT `scrap_entries_ibfk_3` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `scrap_entries_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `stock_ledger`
--
ALTER TABLE `stock_ledger`
  ADD CONSTRAINT `stock_ledger_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `stock_ledger_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `stock_ledger_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `stock_transfers`
--
ALTER TABLE `stock_transfers`
  ADD CONSTRAINT `stock_transfers_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `stock_transfers_ibfk_2` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `stock_transfers_ibfk_3` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `stock_transfers_ibfk_4` FOREIGN KEY (`transferred_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `stone_blocks`
--
ALTER TABLE `stone_blocks`
  ADD CONSTRAINT `stone_blocks_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `stone_blocks` (`id`),
  ADD CONSTRAINT `stone_blocks_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `stone_blocks_ibfk_3` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `stone_blocks_ibfk_4` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  ADD CONSTRAINT `stone_blocks_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `structural_components`
--
ALTER TABLE `structural_components`
  ADD CONSTRAINT `structural_components_ibfk_1` FOREIGN KEY (`stone_block_id`) REFERENCES `stone_blocks` (`id`),
  ADD CONSTRAINT `structural_components_ibfk_2` FOREIGN KEY (`position_id`) REFERENCES `blueprint_positions` (`id`),
  ADD CONSTRAINT `structural_components_ibfk_3` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`);

--
-- Constraints for table `structure_layers`
--
ALTER TABLE `structure_layers`
  ADD CONSTRAINT `structure_layers_ibfk_1` FOREIGN KEY (`structure_type_id`) REFERENCES `structure_types` (`id`);

--
-- Constraints for table `structure_types`
--
ALTER TABLE `structure_types`
  ADD CONSTRAINT `structure_types_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`);

--
-- Constraints for table `warehouses`
--
ALTER TABLE `warehouses`
  ADD CONSTRAINT `warehouses_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
