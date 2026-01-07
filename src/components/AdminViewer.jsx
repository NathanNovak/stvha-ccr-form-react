import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { generateComplianceReport, formatReportAsHTML, formatReportAsText } from '../utils/reportGenerator';
import { downloadViolationsDocument } from '../utils/documentGenerator';
import '../styles/AdminViewer.css';

// EmailJS configuration
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || "YOUR_EMAILJS_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID || "YOUR_EMAILJS_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID || "YOUR_EMAILJS_TEMPLATE_ID";

if (EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY") {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

function AdminViewer() {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();

  // State
  const [allReviews, setAllReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [filters, setFilters] = useState({
    address: '',
    team: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    hasImages: ''
  });

  // Modal state
  const [selectedReview, setSelectedReview] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  // Report generation state
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState('');

  // Summary view state
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState([]);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load reviews on mount
  useEffect(() => {
    loadReviews();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [filters, allReviews]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showLightbox) {
        if (e.key === 'ArrowLeft') prevImage();
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'Escape') closeLightbox();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLightbox, lightboxIndex]);

  const loadReviews = async () => {
    setLoading(true);
    setError('');

    try {
      const q = query(collection(db, 'complianceReviews'), orderBy('submittedAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const reviews = [];
      querySnapshot.forEach((doc) => {
        reviews.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setAllReviews(reviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setError('Error loading reviews: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allReviews];

    if (filters.address) {
      filtered = filtered.filter(r =>
        r.propertyAddress?.toLowerCase().includes(filters.address.toLowerCase())
      );
    }

    if (filters.team) {
      filtered = filtered.filter(r =>
        r.reviewTeam?.toLowerCase().includes(filters.team.toLowerCase())
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(r =>
        new Date(r.date) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(r =>
        new Date(r.date) <= new Date(filters.dateTo)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(r => r.complianceStatus === filters.status);
    }

    if (filters.hasImages === 'yes') {
      filtered = filtered.filter(r => r.images && r.images.length > 0);
    } else if (filters.hasImages === 'no') {
      filtered = filtered.filter(r => !r.images || r.images.length === 0);
    }

    setFilteredReviews(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openModal = (review) => {
    setSelectedReview(review);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedReview(null);
  };

  const openLightbox = (images, index) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
  };

  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
  };

  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleViewSummary = () => {
    const reportData = generateComplianceReport(allReviews);
    setSummaryData(reportData);
    setShowSummary(true);
  };

  const handleCloseSummary = () => {
    setShowSummary(false);
  };

  const handleDownloadDocument = async () => {
    if (summaryData.length === 0) {
      setReportError('No violations data to generate document');
      setTimeout(() => setReportError(''), 5000);
      return;
    }

    try {
      setGeneratingReport(true);
      setReportError('');

      await downloadViolationsDocument(summaryData);

      setReportSuccess(true);
      setTimeout(() => setReportSuccess(false), 5000);
    } catch (error) {
      console.error('Error downloading document:', error);
      setReportError('Error generating document: ' + error.message);
      setTimeout(() => setReportError(''), 5000);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDeleteClick = (e, review) => {
    e.stopPropagation();
    setReviewToDelete(review);
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setReviewToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'complianceReviews', reviewToDelete.id));

      // Update local state
      setAllReviews(prev => prev.filter(r => r.id !== reviewToDelete.id));

      // Close any open modals
      setShowModal(false);
      setSelectedReview(null);
      setShowDeleteConfirm(false);
      setReviewToDelete(null);

      // Show success message briefly
      setReportSuccess(true);
      setTimeout(() => setReportSuccess(false), 3000);
    } catch (error) {
      console.error('Error deleting review:', error);
      setReportError('Error deleting review: ' + error.message);
      setTimeout(() => setReportError(''), 5000);
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateReport = async () => {
    if (EMAILJS_PUBLIC_KEY === "YOUR_EMAILJS_PUBLIC_KEY") {
      setReportError('EmailJS is not configured. Please add your EmailJS credentials to .env file.');
      setTimeout(() => setReportError(''), 5000);
      return;
    }

    setGeneratingReport(true);
    setReportSuccess(false);
    setReportError('');

    try {
      // Generate the report data
      const reportData = generateComplianceReport(allReviews);

      if (reportData.length === 0) {
        setReportError('No properties with violations found to report.');
        setTimeout(() => setReportError(''), 5000);
        setGeneratingReport(false);
        return;
      }

      // Format the report as HTML and text
      const htmlReport = formatReportAsHTML(reportData);
      const textReport = formatReportAsText(reportData);

      // Send email via EmailJS
      const emailParams = {
        to_email: 'board@stvha.org',
        subject: `CCR Compliance Report - ${new Date().toLocaleDateString()}`,
        report_html: htmlReport,
        report_text: textReport,
        property_count: reportData.length,
        violation_count: reportData.reduce((sum, p) => sum + p.nonCompliantItems.length, 0),
        generated_date: new Date().toLocaleString(),
        generated_by: currentUser.email
      };

      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, emailParams);

      setReportSuccess(true);
      setTimeout(() => setReportSuccess(false), 10000);
    } catch (error) {
      console.error('Error generating report:', error);
      setReportError('Error generating report: ' + error.message);
      setTimeout(() => setReportError(''), 5000);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Statistics
  const totalReviews = allReviews.length;
  const reviewsWithImages = allReviews.filter(r => r.images && r.images.length > 0).length;
  const totalImages = allReviews.reduce((sum, r) => sum + (r.imageCount || 0), 0);
  const showingCount = filteredReviews.length;

  const formatStatus = (status) => {
    if (!status) return 'N/A';
    return status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div className="header-left">
            <h1>📷 Compliance Review Image Viewer</h1>
            <p>View and manage property inspection submissions</p>
          </div>
          <div className="user-section">
            <button className="back-btn" onClick={() => navigate('/form')}>← Back to Form</button>
            <div className="user-email">{currentUser?.email}</div>
            <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters">
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">Search Address</label>
              <input
                type="text"
                name="address"
                value={filters.address}
                onChange={handleFilterChange}
                className="filter-input"
                placeholder="Enter property address..."
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Review Team</label>
              <input
                type="text"
                name="team"
                value={filters.team}
                onChange={handleFilterChange}
                className="filter-input"
                placeholder="Enter reviewer name..."
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Date From</label>
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Date To</label>
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Compliance Status</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="filter-select"
              >
                <option value="">All Statuses</option>
                <option value="resolved">Resolved</option>
                <option value="in-progress">In Progress</option>
                <option value="further-action">Further Action Required</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Has Images</label>
              <select
                name="hasImages"
                value={filters.hasImages}
                onChange={handleFilterChange}
                className="filter-select"
              >
                <option value="">All</option>
                <option value="yes">With Images</option>
                <option value="no">No Images</option>
              </select>
            </div>
          </div>

          {/* Statistics Bar */}
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-label">Total Reviews</span>
              <span className="stat-value">{totalReviews}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">With Images</span>
              <span className="stat-value">{reviewsWithImages}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Images</span>
              <span className="stat-value">{totalImages}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Showing</span>
              <span className="stat-value">{showingCount}</span>
            </div>
          </div>
        </div>

        {/* Report Generation Section */}
        <div className="report-section">
          <div className="report-buttons">
            <button
              className="report-btn summary-btn"
              onClick={handleViewSummary}
              disabled={loading}
            >
              📋 View Violations Summary
            </button>
            {/*<button*/}
            {/*  className="report-btn email-btn"*/}
            {/*  onClick={handleGenerateReport}*/}
            {/*  disabled={generatingReport || loading}*/}
            {/*>*/}
            {/*  {generatingReport ? 'Generating Report...' : '📧 Email Report to Management'}*/}
            {/*</button>*/}
          </div>
          <p className="report-description">
            View all properties with violations or generate and email a detailed report to the management company
          </p>
        </div>

        {/* Report Success Message */}
        {reportSuccess && (
          <div className="success-message">
            Compliance report successfully generated!
          </div>
        )}

        {/* Report Error Message */}
        {reportError && (
          <div className="error-message">{reportError}</div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <div>Loading compliance reviews...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-message">{error}</div>
        )}

        {/* No Results */}
        {!loading && filteredReviews.length === 0 && (
          <div className="no-results">
            <div className="no-results-icon">📋</div>
            <h3>No reviews found</h3>
            <p>Try adjusting your filters or check back later</p>
          </div>
        )}

        {/* Reviews Grid */}
        {!loading && filteredReviews.length > 0 && (
          <div className="reviews-grid">
            {filteredReviews.map(review => (
              <div key={review.id} className="review-card" onClick={() => openModal(review)}>
                <div className="review-header">
                  <div className="review-address">{review.propertyAddress || 'No address'}</div>
                  <div className="review-meta">
                    <span>📅 {formatDate(review.date)}</span>
                    <span>📷 {review.imageCount || 0} photos</span>
                  </div>
                </div>

                {review.images && review.images.length > 0 && (
                  <div className="review-images">
                    {review.images.slice(0, 4).map((url, idx) => (
                      <div
                        key={idx}
                        className="review-image-thumb"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLightbox(review.images, idx);
                        }}
                      >
                        <img src={url} alt={`Property ${idx + 1}`} />
                        {idx === 3 && review.images.length > 4 && (
                          <div className="image-count-badge">+{review.images.length - 4}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="review-info">
                  <div className="info-row">
                    <span className="info-label">Review Team</span>
                    <span className="info-value">{review.reviewTeam || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Submitted</span>
                    <span className="info-value">
                      {formatDate(review.submittedAt)} by {review.submittedBy || 'Unknown'}
                    </span>
                  </div>
                  {review.complianceStatus && (
                    <div className="info-row">
                      <span className="info-label">Status</span>
                      <span className={`status-badge status-${review.complianceStatus}`}>
                        {formatStatus(review.complianceStatus)}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  className="delete-card-btn"
                  onClick={(e) => handleDeleteClick(e, review)}
                  title="Delete this review"
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {showModal && selectedReview && (
          <div className="modal" onClick={(e) => e.target.className === 'modal' && closeModal()}>
            <div className="modal-content">
              <span className="modal-close" onClick={closeModal}>&times;</span>

              <div className="modal-header">
                <h2 className="modal-title">{selectedReview.propertyAddress || 'Property Review'}</h2>
                <p className="modal-subtitle">
                  Reviewed by {selectedReview.reviewTeam || 'Unknown'} on {formatDate(selectedReview.date)}
                </p>
                <button
                  className="delete-modal-btn"
                  onClick={(e) => handleDeleteClick(e, selectedReview)}
                  title="Delete this review"
                >
                  🗑️ Delete Review
                </button>
              </div>

              <div className="modal-body">
                {/* Images Section */}
                {selectedReview.images && selectedReview.images.length > 0 && (
                  <div className="modal-section">
                    <h3 className="modal-section-title">📷 Property Images ({selectedReview.images.length})</h3>
                    <div className="modal-images-grid">
                      {selectedReview.images.map((url, idx) => (
                        <div
                          key={idx}
                          className="modal-image"
                          onClick={() => openLightbox(selectedReview.images, idx)}
                        >
                          <img src={url} alt={`Property ${idx + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Basic Information */}
                <div className="modal-section">
                  <h3 className="modal-section-title">📋 Basic Information</h3>
                  <div className="detail-grid">
                    <DetailItem label="Property Address" value={selectedReview.propertyAddress} />
                    <DetailItem label="Review Date" value={formatDate(selectedReview.date)} />
                    <DetailItem label="Review Team" value={selectedReview.reviewTeam} />
                    <DetailItem label="Submitted By" value={selectedReview.submittedBy} />
                  </div>
                </div>

                {/* Inspection Results */}
                <div className="modal-section">
                  <h3 className="modal-section-title">✅ Inspection Results</h3>
                  <div className="detail-grid">
                    <InspectionItem label="Overall Appearance" value={selectedReview.overallAppearance} />
                    <InspectionItem label="Paint/Stucco" value={selectedReview.paintStucco} />
                    <InspectionItem label="Tile Roof" value={selectedReview.tileRoof} />
                    <InspectionItem label="Gutters" value={selectedReview.gutters} />
                    <InspectionItem label="Windows" value={selectedReview.windows} />
                    <InspectionItem label="Doors" value={selectedReview.doors} />
                    <InspectionItem label="Fencing" value={selectedReview.fencing} />
                    <InspectionItem label="Driveway" value={selectedReview.driveway} />
                    <InspectionItem label="Walkways" value={selectedReview.walkways} />
                    <InspectionItem label="Landscape Overall" value={selectedReview.landscapeOverall} />
                    <InspectionItem label="Ground Cover" value={selectedReview.groundCover} />
                    <InspectionItem label="Trees & Shrubs" value={selectedReview.treesShrubs} />
                    <InspectionItem label="Dead Plants" value={selectedReview.deadPlants} />
                    <InspectionItem label="Mistletoe" value={selectedReview.mistletoe} />
                    <InspectionItem label="Rocks/Gravel" value={selectedReview.rocksGravel} />
                    <InspectionItem label="Mailbox" value={selectedReview.mailbox} />
                    <InspectionItem label="Lamppost" value={selectedReview.lamppost} />
                    <InspectionItem label="House Numbers" value={selectedReview.houseNumbers} />
                    <InspectionItem label="Exterior Lighting" value={selectedReview.exteriorLighting} />
                    <InspectionItem label="Trash/Debris" value={selectedReview.trashDebris} />
                    <InspectionItem label="Trash Cans" value={selectedReview.trashCans} />
                    <InspectionItem label="Unauthorized Structures" value={selectedReview.unauthorizedStructures} />
                    <InspectionItem label="Inoperable Vehicles" value={selectedReview.inoperableVehicles} />
                    <InspectionItem label="Commercial Vehicles" value={selectedReview.commercialVehicles} />
                    <InspectionItem label="Approved Parking" value={selectedReview.approvedParking} />
                  </div>
                </div>

                {/* Comments */}
                {selectedReview.detailedComments && (
                  <div className="modal-section">
                    <h3 className="modal-section-title">💬 Detailed Comments</h3>
                    <div className="comments-box">{selectedReview.detailedComments}</div>
                  </div>
                )}

                {/* Follow-up Actions */}
                <div className="modal-section">
                  <h3 className="modal-section-title">📝 Follow-up Actions</h3>
                  <div className="detail-grid">
                    <DetailItem
                      label="Violation Notice Sent"
                      value={selectedReview.violationNotice === 'yes' ? 'Yes' : 'No'}
                    />
                    {selectedReview.violationNoticeDate && (
                      <DetailItem
                        label="Notice Date"
                        value={formatDate(selectedReview.violationNoticeDate)}
                      />
                    )}
                    {selectedReview.complianceDeadline && (
                      <DetailItem
                        label="Compliance Deadline"
                        value={formatDate(selectedReview.complianceDeadline)}
                      />
                    )}
                    {selectedReview.reinspectionDate && (
                      <DetailItem
                        label="Re-inspection Date"
                        value={formatDate(selectedReview.reinspectionDate)}
                      />
                    )}
                    {selectedReview.complianceStatus && (
                      <DetailItem
                        label="Compliance Status"
                        value={formatStatus(selectedReview.complianceStatus)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Violations Summary Modal */}
        {showSummary && (
          <div className="modal summary-modal" onClick={(e) => e.target.className.includes('modal') && handleCloseSummary()}>
            <div className="modal-content summary-content">
              <span className="modal-close" onClick={handleCloseSummary}>&times;</span>

              <div className="modal-header">
                <h2 className="modal-title">Compliance Violations Summary</h2>
                <p className="modal-subtitle">
                  Properties with non-compliant items - Generated {new Date().toLocaleDateString()}
                </p>
                {summaryData.length > 0 && (
                  <button
                    className="download-document-btn"
                    onClick={handleDownloadDocument}
                    disabled={generatingReport}
                  >
                    {generatingReport ? '📄 Generating...' : '📄 Download Word Document'}
                  </button>
                )}
              </div>

              <div className="modal-body">
                {summaryData.length === 0 ? (
                  <div className="no-violations">
                    <div className="no-violations-icon">✅</div>
                    <h3>No Violations Found</h3>
                    <p>All properties are currently in compliance</p>
                  </div>
                ) : (
                  <>
                    {/* Summary Statistics */}
                    <div className="summary-stats">
                      <div className="summary-stat-card">
                        <div className="summary-stat-value">{summaryData.length}</div>
                        <div className="summary-stat-label">Properties with Violations</div>
                      </div>
                      <div className="summary-stat-card">
                        <div className="summary-stat-value">
                          {summaryData.reduce((sum, p) => sum + p.nonCompliantItems.length, 0)}
                        </div>
                        <div className="summary-stat-label">Total Violations</div>
                      </div>
                      <div className="summary-stat-card">
                        <div className="summary-stat-value">
                          {summaryData.filter(p => p.nonCompliantItems.some(i => i.status === 'major')).length}
                        </div>
                        <div className="summary-stat-label">With Major Issues</div>
                      </div>
                      <div className="summary-stat-card">
                        <div className="summary-stat-value">
                          {summaryData.filter(p => p.imageCount > 0).length}
                        </div>
                        <div className="summary-stat-label">With Photos</div>
                      </div>
                    </div>

                    {/* Properties List */}
                    <div className="summary-properties">
                      {summaryData.map((property, index) => {
                        const majorItems = property.nonCompliantItems.filter(item => item.status === 'major');
                        const minorItems = property.nonCompliantItems.filter(item => item.status === 'minor');

                        return (
                          <div key={index} className="summary-property-card">
                            <div className="summary-property-header">
                              <h3 className="summary-property-address">
                                {index + 1}. {property.address}
                              </h3>
                              <div className="summary-property-meta">
                                <span className="summary-meta-item">
                                  📅 {formatDate(property.reviewDate)}
                                </span>
                                <span className="summary-meta-item">
                                  👥 {property.reviewTeam}
                                </span>
                                {property.imageCount > 0 && (
                                  <span className="summary-meta-item">
                                    📷 {property.imageCount} photo{property.imageCount > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="summary-property-body">
                              {/* Compliance Status */}
                              {property.complianceStatus && (
                                <div className="summary-status-row">
                                  <span className="summary-label">Compliance Status:</span>
                                  <span className={`status-badge status-${property.complianceStatus}`}>
                                    {formatStatus(property.complianceStatus)}
                                  </span>
                                </div>
                              )}

                              {/* Violations */}
                              <div className="summary-violations">
                                <div className="summary-section-title">
                                  Violations Found ({property.nonCompliantItems.length})
                                </div>

                                {majorItems.length > 0 && (
                                  <div className="summary-violation-group">
                                    <div className="violation-severity major-severity">
                                      🔴 Major Issues ({majorItems.length})
                                    </div>
                                    <ul className="violation-list">
                                      {majorItems.map((item, idx) => (
                                        <li key={idx} className="violation-item major">
                                          {item.item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {minorItems.length > 0 && (
                                  <div className="summary-violation-group">
                                    <div className="violation-severity minor-severity">
                                      🟡 Minor Issues ({minorItems.length})
                                    </div>
                                    <ul className="violation-list">
                                      {minorItems.map((item, idx) => (
                                        <li key={idx} className="violation-item minor">
                                          {item.item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>

                              {/* Comments */}
                              {property.comments && (
                                <div className="summary-comments">
                                  <div className="summary-section-title">Comments</div>
                                  <div className="summary-comments-text">{property.comments}</div>
                                </div>
                              )}

                              {/* Images */}
                              {property.images && property.images.length > 0 && (
                                <div className="summary-images">
                                  <div className="summary-section-title">Photos ({property.images.length})</div>
                                  <div className="summary-images-grid">
                                    {property.images.slice(0, 4).map((img, idx) => (
                                      <div
                                        key={idx}
                                        className="summary-image-thumb"
                                        onClick={() => openLightbox(property.images, idx)}
                                      >
                                        <img src={img} alt={`${property.address} - Photo ${idx + 1}`} />
                                      </div>
                                    ))}
                                    {property.images.length > 4 && (
                                      <div className="summary-image-more">
                                        +{property.images.length - 4} more
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Follow-up Information */}
                              {property.violationNotice && (
                                <div className="summary-followup">
                                  <div className="summary-notice-sent">
                                    ⚠️ Violation Notice Sent
                                  </div>
                                  {property.violationNoticeDate && (
                                    <div className="summary-followup-detail">
                                      Notice Date: {formatDate(property.violationNoticeDate)}
                                    </div>
                                  )}
                                  {property.complianceDeadline && (
                                    <div className="summary-followup-detail">
                                      Compliance Deadline: {formatDate(property.complianceDeadline)}
                                    </div>
                                  )}
                                  {property.reinspectionDate && (
                                    <div className="summary-followup-detail">
                                      Re-inspection: {formatDate(property.reinspectionDate)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && reviewToDelete && (
          <div className="modal delete-confirm-modal">
            <div className="modal-content delete-confirm-content">
              <h2 className="delete-confirm-title">⚠️ Confirm Deletion</h2>
              <p className="delete-confirm-message">
                Are you sure you want to delete the review for:
              </p>
              <p className="delete-confirm-address">
                {reviewToDelete.propertyAddress || 'Unknown address'}
              </p>
              <p className="delete-confirm-warning">
                This action cannot be undone. All associated data and images will be permanently removed.
              </p>
              <div className="delete-confirm-buttons">
                <button
                  className="delete-confirm-cancel"
                  onClick={handleCancelDelete}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="delete-confirm-delete"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Review'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox */}
        {showLightbox && (
          <div className="lightbox" onClick={closeLightbox}>
            <span className="lightbox-close" onClick={closeLightbox}>&times;</span>
            <span className="lightbox-nav lightbox-prev" onClick={(e) => { e.stopPropagation(); prevImage(); }}>
              ‹
            </span>
            <span className="lightbox-nav lightbox-next" onClick={(e) => { e.stopPropagation(); nextImage(); }}>
              ›
            </span>
            <img
              src={lightboxImages[lightboxIndex]}
              alt="Full size"
              className="lightbox-content"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <div className="detail-item">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  );
}

function InspectionItem({ label, value }) {
  if (!value) return null;
  const isStatus = ['accept', 'minor', 'major', 'na'].includes(value);
  return (
    <div className="detail-item">
      <div className="detail-label">{label}</div>
      <div className="detail-value">
        {isStatus ? (
          <span className={`status-badge status-${value}`}>
            {value === 'na' ? 'N/A' : value.toUpperCase()}
          </span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

export default AdminViewer;
