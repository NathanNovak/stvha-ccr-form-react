// Utility for generating compliance reports from Firebase submissions

// All inspection items to check
const INSPECTION_ITEMS = [
  { key: 'overallAppearance', label: 'Overall Appearance' },
  { key: 'paintStucco', label: 'Paint/Stucco' },
  { key: 'tileRoof', label: 'Tile Roof' },
  { key: 'gutters', label: 'Gutters' },
  { key: 'windows', label: 'Windows' },
  { key: 'doors', label: 'Doors' },
  { key: 'fencing', label: 'Fencing' },
  { key: 'driveway', label: 'Driveway' },
  { key: 'walkways', label: 'Walkways' },
  { key: 'landscapeOverall', label: 'Landscape Overall' },
  { key: 'groundCover', label: 'Ground Cover' },
  { key: 'treesShrubs', label: 'Trees & Shrubs' },
  { key: 'deadPlants', label: 'Dead Plants' },
  { key: 'mistletoe', label: 'Mistletoe' },
  { key: 'rocksGravel', label: 'Rocks/Gravel' },
  { key: 'mailbox', label: 'Mailbox' },
  { key: 'lamppost', label: 'Lamppost' },
  { key: 'houseNumbers', label: 'House Numbers' },
  { key: 'exteriorLighting', label: 'Exterior Lighting' },
  { key: 'trashDebris', label: 'Trash/Debris' },
  { key: 'trashCans', label: 'Trash Cans' },
  { key: 'unauthorizedStructures', label: 'Unauthorized Structures' },
  { key: 'inoperableVehicles', label: 'Inoperable Vehicles' },
  { key: 'commercialVehicles', label: 'Commercial Vehicles' },
  { key: 'approvedParking', label: 'Approved Parking' }
];

/**
 * Generate a compliance report from all Firebase submissions
 * @param {Array} allReviews - All compliance reviews from Firebase
 * @returns {Array} Array of report items grouped by address
 */
export function generateComplianceReport(allReviews) {
  const reportData = [];

  allReviews.forEach(review => {
    const nonCompliantItems = [];

    // Check each inspection item for non-accept values
    INSPECTION_ITEMS.forEach(item => {
      const value = review[item.key];
      // If the value exists and is NOT "accept" or "na", it's a violation
      if (value && value !== 'accept' && value !== 'na') {
        nonCompliantItems.push({
          item: item.label,
          status: value, // 'minor' or 'major'
          severity: value === 'major' ? 'Major' : 'Minor'
        });
      }
    });

    // Only include in report if there are non-compliant items
    if (nonCompliantItems.length > 0) {
      reportData.push({
        address: review.propertyAddress || 'Address not provided',
        reviewTeam: review.reviewTeam || 'Unknown',
        reviewDate: review.date || review.submittedAt,
        submittedBy: review.submittedBy || 'Unknown',
        complianceStatus: review.complianceStatus || 'Not specified',
        nonCompliantItems: nonCompliantItems,
        images: review.images || [],
        imageCount: review.imageCount || 0,
        comments: review.detailedComments || '',
        violationNotice: review.violationNotice === 'yes',
        violationNoticeDate: review.violationNoticeDate || '',
        complianceDeadline: review.complianceDeadline || '',
        reinspectionDate: review.reinspectionDate || ''
      });
    }
  });

  // Sort by address for easier reading
  reportData.sort((a, b) => a.address.localeCompare(b.address));

  return reportData;
}

/**
 * Format report data as HTML for email
 * @param {Array} reportData - Report data from generateComplianceReport
 * @returns {string} HTML formatted report
 */
export function formatReportAsHTML(reportData) {
  if (reportData.length === 0) {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #2c5282;">Compliance Report</h2>
        <p>No properties with violations found.</p>
      </div>
    `;
  }

  let html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
      <h1 style="color: #2c5282; border-bottom: 3px solid #2c5282; padding-bottom: 10px;">
        Sunrise Territory Village - Compliance Report
      </h1>
      <p style="color: #666; font-size: 14px;">
        Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
      </p>
      <p style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0;">
        <strong>Total properties with violations: ${reportData.length}</strong>
      </p>
  `;

  reportData.forEach((property, index) => {
    const majorItems = property.nonCompliantItems.filter(item => item.status === 'major');
    const minorItems = property.nonCompliantItems.filter(item => item.status === 'minor');

    html += `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; background: #fff;">
        <h2 style="color: #2d3748; margin-top: 0;">
          ${index + 1}. ${property.address}
        </h2>

        <div style="background: #f7fafc; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Review Team:</strong> ${property.reviewTeam}</p>
          <p style="margin: 5px 0;"><strong>Review Date:</strong> ${new Date(property.reviewDate).toLocaleDateString()}</p>
          <p style="margin: 5px 0;"><strong>Submitted By:</strong> ${property.submittedBy}</p>
          <p style="margin: 5px 0;"><strong>Compliance Status:</strong>
            <span style="background: ${getStatusColor(property.complianceStatus)}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px;">
              ${formatStatus(property.complianceStatus)}
            </span>
          </p>
          ${property.imageCount > 0 ? `<p style="margin: 5px 0;"><strong>Photos Attached:</strong> ${property.imageCount}</p>` : ''}
        </div>

        <h3 style="color: #c53030; margin-top: 20px;">Violations Found (${property.nonCompliantItems.length}):</h3>

        ${majorItems.length > 0 ? `
          <div style="margin: 15px 0;">
            <h4 style="color: #c53030; margin-bottom: 10px;">🔴 Major Issues (${majorItems.length}):</h4>
            <ul style="color: #2d3748;">
              ${majorItems.map(item => `<li style="margin: 5px 0;"><strong>${item.item}</strong></li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${minorItems.length > 0 ? `
          <div style="margin: 15px 0;">
            <h4 style="color: #d69e2e; margin-bottom: 10px;">🟡 Minor Issues (${minorItems.length}):</h4>
            <ul style="color: #2d3748;">
              ${minorItems.map(item => `<li style="margin: 5px 0;">${item.item}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${property.comments ? `
          <div style="background: #edf2f7; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4 style="margin-top: 0; color: #2d3748;">Comments:</h4>
            <p style="margin: 0; white-space: pre-wrap;">${property.comments}</p>
          </div>
        ` : ''}

        ${property.violationNotice ? `
          <div style="background: #fed7d7; border-left: 4px solid #c53030; padding: 15px; margin: 15px 0;">
            <p style="margin: 0;"><strong>⚠️ Violation Notice Sent</strong></p>
            ${property.violationNoticeDate ? `<p style="margin: 5px 0 0 0;">Date: ${new Date(property.violationNoticeDate).toLocaleDateString()}</p>` : ''}
            ${property.complianceDeadline ? `<p style="margin: 5px 0 0 0;">Compliance Deadline: ${new Date(property.complianceDeadline).toLocaleDateString()}</p>` : ''}
            ${property.reinspectionDate ? `<p style="margin: 5px 0 0 0;">Re-inspection Scheduled: ${new Date(property.reinspectionDate).toLocaleDateString()}</p>` : ''}
          </div>
        ` : ''}

        ${property.images.length > 0 ? `
          <div style="margin: 15px 0;">
            <h4 style="color: #2d3748;">📷 Attached Photos (${property.images.length}):</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-top: 10px;">
              ${property.images.slice(0, 6).map((img, idx) => `
                <div style="border: 1px solid #e2e8f0; border-radius: 5px; overflow: hidden;">
                  <a href="${img}" target="_blank" style="display: block;">
                    <img src="${img}" alt="Photo ${idx + 1}" style="width: 100%; height: 150px; object-fit: cover;" />
                  </a>
                </div>
              `).join('')}
              ${property.images.length > 6 ? `
                <div style="background: #edf2f7; border-radius: 5px; display: flex; align-items: center; justify-content: center; height: 150px;">
                  <span style="color: #4a5568; font-weight: bold;">+${property.images.length - 6} more</span>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  });

  html += `
      <div style="margin-top: 30px; padding: 20px; background: #edf2f7; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #2d3748;">Summary Statistics</h3>
        <ul style="color: #4a5568;">
          <li>Total Properties with Violations: ${reportData.length}</li>
          <li>Total Violations Found: ${reportData.reduce((sum, p) => sum + p.nonCompliantItems.length, 0)}</li>
          <li>Properties with Major Issues: ${reportData.filter(p => p.nonCompliantItems.some(i => i.status === 'major')).length}</li>
          <li>Properties with Photos: ${reportData.filter(p => p.imageCount > 0).length}</li>
          <li>Violation Notices Sent: ${reportData.filter(p => p.violationNotice).length}</li>
        </ul>
      </div>

      <p style="margin-top: 30px; color: #718096; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        This report was automatically generated by the CCR Compliance Review System.<br/>
        For questions or concerns, please contact the HOA Board.
      </p>
    </div>
  `;

  return html;
}

/**
 * Format report data as plain text for email
 * @param {Array} reportData - Report data from generateComplianceReport
 * @returns {string} Plain text formatted report
 */
export function formatReportAsText(reportData) {
  if (reportData.length === 0) {
    return 'COMPLIANCE REPORT\n\nNo properties with violations found.';
  }

  let text = 'SUNRISE TERRITORY VILLAGE - COMPLIANCE REPORT\n';
  text += '='.repeat(60) + '\n';
  text += `Generated: ${new Date().toLocaleString()}\n`;
  text += `Total properties with violations: ${reportData.length}\n`;
  text += '='.repeat(60) + '\n\n';

  reportData.forEach((property, index) => {
    text += `\n${index + 1}. ${property.address}\n`;
    text += '-'.repeat(60) + '\n';
    text += `Review Team: ${property.reviewTeam}\n`;
    text += `Review Date: ${new Date(property.reviewDate).toLocaleDateString()}\n`;
    text += `Submitted By: ${property.submittedBy}\n`;
    text += `Compliance Status: ${formatStatus(property.complianceStatus)}\n`;
    if (property.imageCount > 0) {
      text += `Photos Attached: ${property.imageCount}\n`;
    }
    text += '\n';

    const majorItems = property.nonCompliantItems.filter(item => item.status === 'major');
    const minorItems = property.nonCompliantItems.filter(item => item.status === 'minor');

    text += `VIOLATIONS FOUND (${property.nonCompliantItems.length}):\n`;

    if (majorItems.length > 0) {
      text += `\n  MAJOR ISSUES (${majorItems.length}):\n`;
      majorItems.forEach(item => {
        text += `    • ${item.item}\n`;
      });
    }

    if (minorItems.length > 0) {
      text += `\n  MINOR ISSUES (${minorItems.length}):\n`;
      minorItems.forEach(item => {
        text += `    • ${item.item}\n`;
      });
    }

    if (property.comments) {
      text += `\nCOMMENTS:\n${property.comments}\n`;
    }

    if (property.violationNotice) {
      text += `\n⚠️  VIOLATION NOTICE SENT\n`;
      if (property.violationNoticeDate) {
        text += `   Date: ${new Date(property.violationNoticeDate).toLocaleDateString()}\n`;
      }
      if (property.complianceDeadline) {
        text += `   Compliance Deadline: ${new Date(property.complianceDeadline).toLocaleDateString()}\n`;
      }
      if (property.reinspectionDate) {
        text += `   Re-inspection: ${new Date(property.reinspectionDate).toLocaleDateString()}\n`;
      }
    }

    text += '\n';
  });

  text += '\n' + '='.repeat(60) + '\n';
  text += 'SUMMARY STATISTICS\n';
  text += '='.repeat(60) + '\n';
  text += `Total Properties with Violations: ${reportData.length}\n`;
  text += `Total Violations Found: ${reportData.reduce((sum, p) => sum + p.nonCompliantItems.length, 0)}\n`;
  text += `Properties with Major Issues: ${reportData.filter(p => p.nonCompliantItems.some(i => i.status === 'major')).length}\n`;
  text += `Properties with Photos: ${reportData.filter(p => p.imageCount > 0).length}\n`;
  text += `Violation Notices Sent: ${reportData.filter(p => p.violationNotice).length}\n`;

  return text;
}

// Helper functions
function formatStatus(status) {
  if (!status) return 'Not specified';
  return status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getStatusColor(status) {
  switch (status) {
    case 'resolved':
      return '#48bb78';
    case 'in-progress':
      return '#ed8936';
    case 'further-action':
      return '#f56565';
    default:
      return '#718096';
  }
}
