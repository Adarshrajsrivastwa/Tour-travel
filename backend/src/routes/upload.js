const express = require('express');
const fs = require('fs');
const path = require('path');
const { uploadSingle, uploadMultiple, uploadFields } = require('../middleware/upload');
const { successResponse, errorResponse } = require('../utils/response');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/*
 * @swagger
 * /api/upload/single:
 *   post:
 *     summary: Upload single file
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (image or PDF)
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         url:
 *                           type: string
 *                           description: Cloudinary URL
 *                         public_id:
 *                           type: string
 *                           description: Cloudinary public ID
 *                         secure_url:
 *                           type: string
 *                           description: Secure HTTPS URL
 *                         format:
 *                           type: string
 *                           description: File format
 *                         size:
 *                           type: integer
 *                           description: File size in bytes
 *       400:
 *         description: No file uploaded or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/single', authenticateToken, uploadSingle('file'), (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 400, 'No file uploaded');
    }

    successResponse(res, 200, 'File uploaded successfully', {
      url: `/uploads/${req.file.filename}`,
      public_id: req.file.filename,
      secure_url: `/uploads/${req.file.filename}`,
      format: req.file.mimetype ? req.file.mimetype.split('/')[1] : '',
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload single file error:', error);
    errorResponse(res, 500, 'Failed to upload file', error.message);
  }
});

/*
 * @swagger
 * /api/upload/multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Multiple files to upload (images or PDFs)
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           url:
 *                             type: string
 *                             description: Cloudinary URL
 *                           public_id:
 *                             type: string
 *                             description: Cloudinary public ID
 *                           secure_url:
 *                             type: string
 *                             description: Secure HTTPS URL
 *                           format:
 *                             type: string
 *                             description: File format
 *                           size:
 *                             type: integer
 *                             description: File size in bytes
 *       400:
 *         description: No files uploaded or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/multiple', authenticateToken, uploadMultiple('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return errorResponse(res, 400, 'No files uploaded');
    }

    const uploadedFiles = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      public_id: file.filename,
      secure_url: `/uploads/${file.filename}`,
      format: file.mimetype ? file.mimetype.split('/')[1] : '',
      size: file.size
    }));

    successResponse(res, 200, 'Files uploaded successfully', {
      files: uploadedFiles,
      count: uploadedFiles.length
    });
  } catch (error) {
    console.error('Upload multiple files error:', error);
    errorResponse(res, 500, 'Failed to upload files', error.message);
  }
});

/*
 * @swagger
 * /api/upload/driver-documents:
 *   post:
 *     summary: Upload driver documents (Admin only)
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               aadharFront:
 *                 type: string
 *                 format: binary
 *                 description: Aadhar card front image
 *               aadharBack:
 *                 type: string
 *                 format: binary
 *                 description: Aadhar card back image
 *               panCard:
 *                 type: string
 *                 format: binary
 *                 description: PAN card image
 *               drivingLicense:
 *                 type: string
 *                 format: binary
 *                 description: Driving license image
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Driver profile image
 *     responses:
 *       200:
 *         description: Driver documents uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         aadharFront:
 *                           type: string
 *                           description: Aadhar front URL
 *                         aadharBack:
 *                           type: string
 *                           description: Aadhar back URL
 *                         panCard:
 *                           type: string
 *                           description: PAN card URL
 *                         drivingLicense:
 *                           type: string
 *                           description: Driving license URL
 *                         profileImage:
 *                           type: string
 *                           description: Profile image URL
 *       400:
 *         description: No files uploaded or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/driver-documents', authenticateToken, requireAdmin, uploadFields([
  { name: 'aadharFront', maxCount: 1 },
  { name: 'aadharBack', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'drivingLicense', maxCount: 1 },
  { name: 'profileImage', maxCount: 1 }
]), (req, res) => {
  try {
    const uploadedFiles = {};

    if (req.files.aadharFront) {
      uploadedFiles.aadharFront = `/uploads/${req.files.aadharFront[0].filename}`;
    }
    if (req.files.aadharBack) {
      uploadedFiles.aadharBack = `/uploads/${req.files.aadharBack[0].filename}`;
    }
    if (req.files.panCard) {
      uploadedFiles.panCard = `/uploads/${req.files.panCard[0].filename}`;
    }
    if (req.files.drivingLicense) {
      uploadedFiles.drivingLicense = `/uploads/${req.files.drivingLicense[0].filename}`;
    }
    if (req.files.profileImage) {
      uploadedFiles.profileImage = `/uploads/${req.files.profileImage[0].filename}`;
    }

    successResponse(res, 200, 'Driver documents uploaded successfully', uploadedFiles);
  } catch (error) {
    console.error('Upload driver documents error:', error);
    errorResponse(res, 500, 'Failed to upload driver documents', error.message);
  }
});

/*
 * @swagger
 * /api/upload/bus-documents:
 *   post:
 *     summary: Upload bus documents and images (Admin only)
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               rcDocument:
 *                 type: string
 *                 format: binary
 *                 description: RC document (PDF)
 *               pollutionCertificate:
 *                 type: string
 *                 format: binary
 *                 description: Pollution certificate (PDF)
 *               insuranceCertificate:
 *                 type: string
 *                 format: binary
 *                 description: Insurance certificate (PDF)
 *               frontImage:
 *                 type: string
 *                 format: binary
 *                 description: Bus front image
 *               rearImage:
 *                 type: string
 *                 format: binary
 *                 description: Bus rear image
 *               leftImage:
 *                 type: string
 *                 format: binary
 *                 description: Bus left side image
 *               rightImage:
 *                 type: string
 *                 format: binary
 *                 description: Bus right side image
 *     responses:
 *       200:
 *         description: Bus documents uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         rcDocument:
 *                           type: string
 *                           description: RC document URL
 *                         pollutionCertificate:
 *                           type: string
 *                           description: Pollution certificate URL
 *                         insuranceCertificate:
 *                           type: string
 *                           description: Insurance certificate URL
 *                         frontImage:
 *                           type: string
 *                           description: Front image URL
 *                         rearImage:
 *                           type: string
 *                           description: Rear image URL
 *                         leftImage:
 *                           type: string
 *                           description: Left image URL
 *                         rightImage:
 *                           type: string
 *                           description: Right image URL
 *       400:
 *         description: No files uploaded or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/bus-documents', authenticateToken, requireAdmin, uploadFields([
  { name: 'rcDocument', maxCount: 1 },
  { name: 'pollutionCertificate', maxCount: 1 },
  { name: 'insuranceCertificate', maxCount: 1 },
  { name: 'frontImage', maxCount: 1 },
  { name: 'rearImage', maxCount: 1 },
  { name: 'leftImage', maxCount: 1 },
  { name: 'rightImage', maxCount: 1 }
]), (req, res) => {
  try {
    const uploadedFiles = {};

    if (req.files.rcDocument) {
      uploadedFiles.rcDocument = `/uploads/${req.files.rcDocument[0].filename}`;
    }
    if (req.files.pollutionCertificate) {
      uploadedFiles.pollutionCertificate = `/uploads/${req.files.pollutionCertificate[0].filename}`;
    }
    if (req.files.insuranceCertificate) {
      uploadedFiles.insuranceCertificate = `/uploads/${req.files.insuranceCertificate[0].filename}`;
    }

    // Bus images
    const busImages = {};
    if (req.files.frontImage) {
      busImages.front = `/uploads/${req.files.frontImage[0].filename}`;
    }
    if (req.files.rearImage) {
      busImages.rear = `/uploads/${req.files.rearImage[0].filename}`;
    }
    if (req.files.leftImage) {
      busImages.left = `/uploads/${req.files.leftImage[0].filename}`;
    }
    if (req.files.rightImage) {
      busImages.right = `/uploads/${req.files.rightImage[0].filename}`;
    }

    if (Object.keys(busImages).length > 0) {
      uploadedFiles.busImages = busImages;
    }

    successResponse(res, 200, 'Bus documents uploaded successfully', uploadedFiles);
  } catch (error) {
    console.error('Upload bus documents error:', error);
    errorResponse(res, 500, 'Failed to upload bus documents', error.message);
  }
});

/*
 * @swagger
 * /api/upload/{publicId}:
 *   delete:
 *     summary: Delete file from Cloudinary (Admin only)
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cloudinary public ID
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:publicId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    // Prevent directory traversal
    if (publicId.includes('..') || publicId.includes('/') || publicId.includes('\\')) {
      return errorResponse(res, 400, 'Invalid file ID');
    }

    const filePath = path.join(__dirname, '../../uploads', publicId);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      successResponse(res, 200, 'File deleted successfully');
    } else {
      errorResponse(res, 404, 'File not found');
    }
  } catch (error) {
    console.error('Delete file error:', error);
    errorResponse(res, 500, 'Failed to delete file', error.message);
  }
});

module.exports = router;
