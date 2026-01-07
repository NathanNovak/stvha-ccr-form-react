import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import emailjs from '@emailjs/browser';
import useGoogleAutocomplete from '../hooks/useGoogleAutocomplete';
import '../styles/ComplianceForm.css';

// Initialize EmailJS
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || "YOUR_EMAILJS_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID || "YOUR_EMAILJS_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID || "YOUR_EMAILJS_TEMPLATE_ID";

if (EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY") {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

function ComplianceForm() {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    date: '',
    reviewTeam: '',
    propertyAddress: '',
    overallAppearance: '',
    paintStucco: '',
    tileRoof: '',
    gutters: '',
    windows: '',
    doors: '',
    fencing: '',
    driveway: '',
    walkways: '',
    landscapeOverall: '',
    groundCover: '',
    treesShrubs: '',
    deadPlants: '',
    mistletoe: '',
    rocksGravel: '',
    mailbox: '',
    lamppost: '',
    houseNumbers: '',
    exteriorLighting: '',
    trashDebris: '',
    trashCans: '',
    unauthorizedStructures: '',
    inoperableVehicles: '',
    commercialVehicles: '',
    approvedParking: '',
    detailedComments: '',
    violationNotice: '',
    violationNoticeDate: '',
    complianceDeadline: '',
    reinspectionDate: '',
    complianceStatus: ''
  });

  // Image upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const maxFiles = 10;
    const maxSize = 10 * 1024 * 1024; // 10MB

    // Filter for images only
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    // Check total number
    if (selectedFiles.length + imageFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} images allowed`);
      setTimeout(() => setError(''), 5000);
      return;
    }

    // Check file sizes
    const oversized = imageFiles.filter(file => file.size > maxSize);
    if (oversized.length > 0) {
      setError('Some files are too large. Maximum size is 10MB per image.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // Add new files
    const newFiles = [...selectedFiles, ...imageFiles];
    setSelectedFiles(newFiles);

    // Create previews
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, {
          url: e.target.result,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const uploadImages = async () => {
    if (selectedFiles.length === 0) return [];

    setUploading(true);
    const urls = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const filename = `compliance-photos/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, filename);

      try {
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        const url = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              const overallProgress = ((i + (progress / 100)) / selectedFiles.length) * 100;
              setUploadProgress(overallProgress);
            },
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });

        urls.push(url);
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
        throw error;
      }
    }

    setUploading(false);
    return urls;
  };

  const sendEmailNotification = async (reviewData) => {
    if (EMAILJS_PUBLIC_KEY === "YOUR_EMAILJS_PUBLIC_KEY") {
      console.log('EmailJS not configured');
      return false;
    }

    try {
      const emailParams = {
        to_email: 'board@stvha.org',
        property_address: reviewData.propertyAddress,
        review_date: reviewData.date,
        review_team: reviewData.reviewTeam,
        submitted_by: reviewData.submittedBy,
        image_count: reviewData.imageCount || 0,
        compliance_status: reviewData.complianceStatus || 'Not specified',
        has_violations: (reviewData.complianceStatus === 'further-action' || reviewData.complianceStatus === 'in-progress') ? 'Yes' : 'No',
        comments: reviewData.detailedComments || 'No comments provided',
        admin_link: window.location.origin + '/admin'
      };

      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, emailParams);
      console.log('Email notification sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setError('');
    setSubmitting(true);

    try {
      // Upload images
      const imageUrls = await uploadImages();

      // Prepare data
      const submitData = {
        ...formData,
        images: imageUrls,
        imageCount: imageUrls.length,
        submittedAt: new Date().toISOString(),
        submittedBy: currentUser.email
      };

      // Save to Firestore
      await addDoc(collection(db, 'complianceReviews'), submitData);

      // Send email notification
      await sendEmailNotification(submitData);

      // Show success
      setSuccess(true);
      
      // Reset form
      setFormData({
        date: '',
        reviewTeam: '',
        propertyAddress: '',
        overallAppearance: '',
        paintStucco: '',
        tileRoof: '',
        gutters: '',
        windows: '',
        doors: '',
        fencing: '',
        driveway: '',
        walkways: '',
        landscapeOverall: '',
        groundCover: '',
        treesShrubs: '',
        deadPlants: '',
        mistletoe: '',
        rocksGravel: '',
        mailbox: '',
        lamppost: '',
        houseNumbers: '',
        exteriorLighting: '',
        trashDebris: '',
        trashCans: '',
        unauthorizedStructures: '',
        inoperableVehicles: '',
        commercialVehicles: '',
        approvedParking: '',
        detailedComments: '',
        violationNotice: '',
        violationNoticeDate: '',
        complianceDeadline: '',
        reinspectionDate: '',
        complianceStatus: ''
      });
      setSelectedFiles([]);
      setImagePreviews([]);
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Hide success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);

    } catch (error) {
      console.error('Error submitting form:', error);
      setError('Error submitting form: ' + error.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Handle address selection from Google Autocomplete
  const handleAddressSelected = (address) => {
    setFormData(prev => ({
      ...prev,
      propertyAddress: address
    }));
  };

  // Initialize Google Autocomplete
  const addressInputRef = useGoogleAutocomplete(handleAddressSelected);

  const RadioGroup = ({ name, label }) => (
    <div className="question">
      <div className="item-label">{label}</div>
      <div className="radio-group">
        {['accept', 'minor', 'major', 'na'].map(value => (
          <div className="radio-option" key={value}>
            <input
              type="radio"
              id={`${name}-${value}`}
              name={name}
              value={value}
              checked={formData[name] === value}
              onChange={handleInputChange}
            />
            <label htmlFor={`${name}-${value}`}>
              {value === 'na' ? 'N/A' : value.charAt(0).toUpperCase() + value.slice(1)}
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="form-page">
      <div className="form-container">
        {success && (
          <div className="success-message">
            Form submitted successfully! The form has been reset.
          </div>
        )}

        {error && (
          <div className="error-message">{error}</div>
        )}

        <div className="form-header">
          <h1 className="form-title">
            Sunrise Territory Village<br />
            CCR Compliance Review Checklist
          </h1>
          <p className="form-description">
            Board of Directors Property Compliance Review<br />
            Check appropriate box for each item. Add comments in the designated areas.
          </p>
        </div>

        <div className="user-info">
          <span className="user-email">{currentUser?.email}</span>
          <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
        </div>

        <div className="admin-link">
          <Link to="/admin">📊 Admin Portal - View All Submissions</Link>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information Section */}
          <div className="form-section">
            <div className="question">
              <label className="question-label">
                Date<span className="required">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="question">
              <label className="question-label">
                Review Team<span className="required">*</span>
              </label>
              <input
                type="text"
                name="reviewTeam"
                value={formData.reviewTeam}
                onChange={handleInputChange}
                placeholder="Enter reviewer names"
                required
              />
            </div>

            <div className="question">
              <label className="question-label">
                Property Address<span className="required">*</span>
              </label>
              <input
                ref={addressInputRef}
                type="text"
                name="propertyAddress"
                value={formData.propertyAddress}
                onChange={handleInputChange}
                placeholder="Start typing to search addresses..."
                required
                autoComplete="off"
              />
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="form-section">
            <h2 className="section-title">Property Photos</h2>
            <div className="question">
              <label className="question-label">Upload Photos (Optional)</label>
              <p className="file-upload-hint">Add photos to document violations or property condition</p>

              <div
                className="file-upload-area"
                onClick={() => document.getElementById('fileInput').click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="file-upload-icon">📷</div>
                <div className="file-upload-text">Click to upload or drag and drop</div>
                <div className="file-upload-hint">PNG, JPG, HEIC up to 10MB each (Max 10 photos)</div>
              </div>

              <input
                type="file"
                id="fileInput"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {imagePreviews.length > 0 && (
                <div className="image-preview-container">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="image-preview">
                      <img src={preview.url} alt={`Preview ${index + 1}`} />
                      <button
                        type="button"
                        className="image-preview-remove"
                        onClick={() => removeImage(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploading && (
                <div className="upload-progress">
                  <div className="upload-progress-text">
                    Uploading images... {Math.round(uploadProgress)}%
                  </div>
                  <div className="upload-progress-bar">
                    <div
                      className="upload-progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Overall Property Appearance */}
          <div className="form-section">
            <h2 className="section-title">Overall Property Appearance</h2>
            <RadioGroup name="overallAppearance" label="General appearance and curb appeal" />
          </div>

          {/* Exterior Structures */}
          <div className="form-section">
            <h2 className="section-title">Exterior Structures</h2>
            <RadioGroup name="paintStucco" label="Paint and/or stucco condition" />
            <RadioGroup name="tileRoof" label="Tile roof condition" />
            <RadioGroup name="gutters" label="Gutters and downspouts" />
            <RadioGroup name="windows" label="Windows and screens" />
            <RadioGroup name="doors" label="Doors and garage doors" />
            <RadioGroup name="fencing" label="Fencing condition and appearance" />
          </div>

          {/* Hardscape */}
          <div className="form-section">
            <h2 className="section-title">Hardscape</h2>
            <RadioGroup name="driveway" label="Driveway condition (cracks, stains, etc.)" />
            <RadioGroup name="walkways" label="Walkways and patios" />
          </div>

          {/* Landscaping */}
          <div className="form-section">
            <h2 className="section-title">Landscaping</h2>
            <RadioGroup name="landscapeOverall" label="Overall landscaping condition" />
            <RadioGroup name="groundCover" label="Ground cover/xeriscape maintained" />
            <RadioGroup name="treesShrubs" label="Trees and shrubs (trimmed, healthy)" />
            <RadioGroup name="deadPlants" label="Dead/dying trees, shrubs, cacti, succulents" />
            <RadioGroup name="mistletoe" label="Mistletoe present in trees" />
            <RadioGroup name="rocksGravel" label="Landscape rocks/gravel maintained" />
          </div>

          {/* Fixtures & Amenities */}
          <div className="form-section">
            <h2 className="section-title">Fixtures & Amenities</h2>
            <RadioGroup name="mailbox" label="Mailbox condition" />
            <RadioGroup name="lamppost" label="Lamppost condition" />
            <RadioGroup name="houseNumbers" label="House numbers visible/condition" />
            <RadioGroup name="exteriorLighting" label="Exterior lighting functional" />
          </div>

          {/* Storage & Cleanliness */}
          <div className="form-section">
            <h2 className="section-title">Storage & Cleanliness</h2>
            <RadioGroup name="trashDebris" label="No visible trash/debris" />
            <RadioGroup name="trashCans" label="Trash cans properly stored" />
            <RadioGroup name="unauthorizedStructures" label="No unauthorized structures/storage" />
          </div>

          {/* Vehicles & Parking */}
          <div className="form-section">
            <h2 className="section-title">Vehicles & Parking</h2>
            <RadioGroup name="inoperableVehicles" label="No inoperable vehicles visible" />
            <RadioGroup name="commercialVehicles" label="No commercial vehicles/trailers/RVs" />
            <RadioGroup name="approvedParking" label="Vehicles parked in approved areas" />
          </div>

          {/* Detailed Comments */}
          <div className="form-section">
            <h2 className="section-title">Detailed Comments / Violation Specifics</h2>
            <div className="question">
              <label className="question-label">
                Include specific locations, measurements, or descriptions as needed
              </label>
              <textarea
                name="detailedComments"
                value={formData.detailedComments}
                onChange={handleInputChange}
                placeholder="Enter detailed comments here..."
              />
            </div>
          </div>

          {/* Follow-up Actions */}
          <div className="form-section">
            <h2 className="section-title">Follow-up Actions</h2>

            <div className="question">
              <label className="question-label">Violation Notice Sent?</label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    type="radio"
                    id="notice-yes"
                    name="violationNotice"
                    value="yes"
                    checked={formData.violationNotice === 'yes'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="notice-yes">Yes</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="notice-no"
                    name="violationNotice"
                    value="no"
                    checked={formData.violationNotice === 'no'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="notice-no">No</label>
                </div>
              </div>
            </div>

            <div className="question">
              <label className="question-label">Violation Notice Date (if applicable)</label>
              <input
                type="date"
                name="violationNoticeDate"
                value={formData.violationNoticeDate}
                onChange={handleInputChange}
              />
            </div>

            <div className="question">
              <label className="question-label">Compliance Deadline</label>
              <input
                type="date"
                name="complianceDeadline"
                value={formData.complianceDeadline}
                onChange={handleInputChange}
              />
            </div>

            <div className="question">
              <label className="question-label">Re-inspection Date</label>
              <input
                type="date"
                name="reinspectionDate"
                value={formData.reinspectionDate}
                onChange={handleInputChange}
              />
            </div>

            <div className="question">
              <label className="question-label">Compliance Status</label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    type="radio"
                    id="status-resolved"
                    name="complianceStatus"
                    value="resolved"
                    checked={formData.complianceStatus === 'resolved'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="status-resolved">Resolved</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="status-progress"
                    name="complianceStatus"
                    value="in-progress"
                    checked={formData.complianceStatus === 'in-progress'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="status-progress">In Progress</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="status-action"
                    name="complianceStatus"
                    value="further-action"
                    checked={formData.complianceStatus === 'further-action'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="status-action">Further Action Required</label>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-section">
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? (uploading ? 'Uploading Images...' : 'Submitting...') : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ComplianceForm;
