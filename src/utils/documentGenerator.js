import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableCell, TableRow, WidthType, ExternalHyperlink } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Fetch image as array buffer for embedding in document
 * Uses canvas conversion to bypass CORS issues
 * @param {string} url - Image URL
 * @returns {Promise<ArrayBuffer>}
 */
async function fetchImageAsBuffer(url) {
  return new Promise((resolve) => {
    console.log('Loading image from:', url);

    const img = new Image();

    // Enable CORS for the image
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        console.log('Image loaded successfully, converting to blob...');

        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            console.log('Image converted successfully. Type:', blob.type, 'Size:', blob.size);
            const arrayBuffer = await blob.arrayBuffer();
            resolve(arrayBuffer);
          } else {
            console.error('Failed to convert image to blob');
            resolve(null);
          }
        }, 'image/jpeg', 0.95);

      } catch (error) {
        console.error('Error converting image:', error);
        resolve(null);
      }
    };

    img.onerror = (error) => {
      console.error('Error loading image from URL:', url, error);
      resolve(null);
    };

    // Start loading the image
    img.src = url;
  });
}

/**
 * Get image dimensions and format
 * @param {string} url - Image URL
 * @returns {Promise<{width: number, height: number}>}
 */
function getImageDimensions(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Max width 600px (about 6 inches in the document)
      const maxWidth = 600;
      const scale = Math.min(1, maxWidth / img.width);
      resolve({
        width: img.width * scale,
        height: img.height * scale
      });
    };
    img.onerror = () => {
      // Default dimensions if image fails to load
      resolve({ width: 400, height: 300 });
    };
    img.src = url;
  });
}

/**
 * Generate a Word document for violation letters
 * @param {Array} reportData - Report data from generateComplianceReport
 */
export async function generateViolationLettersDocument(reportData) {
  if (!reportData || reportData.length === 0) {
    throw new Error('No violation data to generate document');
  }

  const children = [];

  // Title Page
  children.push(
    new Paragraph({
      text: 'CCR COMPLIANCE VIOLATIONS REPORT',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: `Sunrise Territory Village Homeowners Association`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      text: `Generated: ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      text: `Total Properties with Violations: ${reportData.length}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: '',
      pageBreakBefore: true
    })
  );

  // Summary Statistics
  const totalViolations = reportData.reduce((sum, p) => sum + p.nonCompliantItems.length, 0);
  const propertiesWithMajor = reportData.filter(p =>
    p.nonCompliantItems.some(i => i.status === 'major')
  ).length;
  const propertiesWithPhotos = reportData.filter(p => p.imageCount > 0).length;

  children.push(
    new Paragraph({
      text: 'SUMMARY STATISTICS',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Total Properties with Violations: ', bold: true }),
        new TextRun({ text: reportData.length.toString() })
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Total Violations Found: ', bold: true }),
        new TextRun({ text: totalViolations.toString() })
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Properties with Major Issues: ', bold: true }),
        new TextRun({ text: propertiesWithMajor.toString() })
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Properties with Photo Documentation: ', bold: true }),
        new TextRun({ text: propertiesWithPhotos.toString() })
      ],
      spacing: { after: 400 }
    }),
    new Paragraph({
      text: '',
      pageBreakBefore: true
    })
  );

  // Individual Property Reports - Process sequentially to handle async image loading
  for (let index = 0; index < reportData.length; index++) {
    const property = reportData[index];
    const majorItems = property.nonCompliantItems.filter(item => item.status === 'major');
    const minorItems = property.nonCompliantItems.filter(item => item.status === 'minor');

    // Property Header
    children.push(
      new Paragraph({
        text: `PROPERTY ${index + 1} OF ${reportData.length}`,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        border: {
          bottom: {
            color: '667eea',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6
          }
        }
      })
    );

    // Property Address (prominent)
    children.push(
      new Paragraph({
        text: property.address,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      })
    );

    // Property Details Table
    children.push(
      new Paragraph({
        text: 'PROPERTY DETAILS',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 }
      })
    );

    const detailsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: 'Review Date:', bold: true })],
              width: { size: 30, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ text: new Date(property.reviewDate).toLocaleDateString() })],
              width: { size: 70, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: 'Review Team:', bold: true })]
            }),
            new TableCell({
              children: [new Paragraph({ text: property.reviewTeam })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: 'Submitted By:', bold: true })]
            }),
            new TableCell({
              children: [new Paragraph({ text: property.submittedBy })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: 'Compliance Status:', bold: true })]
            }),
            new TableCell({
              children: [new Paragraph({ text: formatStatus(property.complianceStatus) })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: 'Photos Available:', bold: true })]
            }),
            new TableCell({
              children: [new Paragraph({ text: `${property.imageCount || 0} photo(s)` })]
            })
          ]
        })
      ]
    });

    // Add table directly, not wrapped in paragraph
    children.push(detailsTable);

    // Add spacing after table
    children.push(
      new Paragraph({
        text: '',
        spacing: { after: 300 }
      })
    );

    // Violations Section
    children.push(
      new Paragraph({
        text: `VIOLATIONS FOUND (${property.nonCompliantItems.length})`,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 }
      })
    );

    // Major Violations
    if (majorItems.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `🔴 MAJOR ISSUES (${majorItems.length})`,
              bold: true,
              color: 'c62828'
            })
          ],
          spacing: { before: 100, after: 100 }
        })
      );

      majorItems.forEach((item, idx) => {
        children.push(
          new Paragraph({
            text: `${idx + 1}. ${item.item}`,
            bullet: { level: 0 },
            spacing: { after: 50 }
          })
        );
      });

      children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    }

    // Minor Violations
    if (minorItems.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `🟡 MINOR ISSUES (${minorItems.length})`,
              bold: true,
              color: 'f57c00'
            })
          ],
          spacing: { before: 100, after: 100 }
        })
      );

      minorItems.forEach((item, idx) => {
        children.push(
          new Paragraph({
            text: `${idx + 1}. ${item.item}`,
            bullet: { level: 0 },
            spacing: { after: 50 }
          })
        );
      });

      children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    }

    // Inspector Comments
    if (property.comments) {
      children.push(
        new Paragraph({
          text: 'INSPECTOR COMMENTS',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: property.comments,
          spacing: { after: 200 },
          italics: true
        })
      );
    }

    // Property Images Section - Include as clickable links
    if (property.images && property.images.length > 0) {
      children.push(
        new Paragraph({
          text: `PROPERTY PHOTOS (${property.images.length})`,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: 'Click on any link below to view the photo in your browser:',
          italics: true,
          spacing: { after: 150 }
        })
      );

      // Add clickable links for each image
      property.images.forEach((imageUrl, imgIndex) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${imgIndex + 1}. `,
                bold: true
              }),
              new ExternalHyperlink({
                children: [
                  new TextRun({
                    text: `Photo ${imgIndex + 1}`,
                    style: 'Hyperlink',
                    underline: {
                      type: 'single'
                    },
                    color: '0563C1'
                  })
                ],
                link: imageUrl
              }),
              new TextRun({
                text: ` - Click to view`,
                italics: true
              })
            ],
            spacing: { after: 80 }
          })
        );
      });

      // Add spacing after images section
      children.push(
        new Paragraph({
          text: '',
          spacing: { after: 200 }
        })
      );
    }

    // Follow-up Information
    if (property.violationNotice) {
      children.push(
        new Paragraph({
          text: 'FOLLOW-UP ACTIONS',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '⚠️ VIOLATION NOTICE SENT', bold: true, color: 'c62828' })
          ],
          spacing: { after: 100 }
        })
      );

      if (property.violationNoticeDate) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Notice Date: ', bold: true }),
              new TextRun({ text: new Date(property.violationNoticeDate).toLocaleDateString() })
            ],
            spacing: { after: 50 }
          })
        );
      }

      if (property.complianceDeadline) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Compliance Deadline: ', bold: true }),
              new TextRun({ text: new Date(property.complianceDeadline).toLocaleDateString() })
            ],
            spacing: { after: 50 }
          })
        );
      }

      if (property.reinspectionDate) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Re-inspection Date: ', bold: true }),
              new TextRun({ text: new Date(property.reinspectionDate).toLocaleDateString() })
            ],
            spacing: { after: 50 }
          })
        );
      }
    }

    // Add separator between properties (except last)
    if (index < reportData.length - 1) {
      children.push(
        new Paragraph({
          text: '',
          spacing: { after: 400 },
          border: {
            bottom: {
              color: 'CCCCCC',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 12
            }
          }
        })
      );
    }
  }

  // Footer page with contact info
  children.push(
    new Paragraph({
      text: '',
      pageBreakBefore: true
    }),
    new Paragraph({
      text: 'END OF REPORT',
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: `Generated: ${new Date().toLocaleString()}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      text: 'Sunrise Territory Village Homeowners Association',
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 }
    }),
    new Paragraph({
      text: 'CCR Compliance Review System',
      alignment: AlignmentType.CENTER,
      italics: true
    })
  );

  // Create the document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720,    // 0.5 inch
            right: 720,
            bottom: 720,
            left: 720
          }
        }
      },
      children: children
    }]
  });

  return doc;
}

/**
 * Download the violations document
 * @param {Array} reportData - Report data from generateComplianceReport
 */
export async function downloadViolationsDocument(reportData) {
  try {
    const doc = await generateViolationLettersDocument(reportData);

    // Use docx's Packer to generate blob
    const { Packer } = await import('docx');
    const blob = await Packer.toBlob(doc);

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `CCR_Violations_Report_${date}.docx`;

    // Trigger download
    saveAs(blob, filename);

    return true;
  } catch (error) {
    console.error('Error generating document:', error);
    throw error;
  }
}

// Helper function
function formatStatus(status) {
  if (!status) return 'Not specified';
  return status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}