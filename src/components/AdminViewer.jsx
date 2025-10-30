import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import '../styles/AdminViewer.css';

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
