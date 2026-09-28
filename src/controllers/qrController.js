import QrCode from "../models/QrCode.js";

// Helper to generate a fast, unique 6-character routing tag
const generateShortId = () => Math.random().toString(36).substring(2, 8);

// @desc    1. Create and Save QR Code Configuration
// @route   POST /api/qrs/create
export const createQrCode = async (req, res) => {
  try {
    const { name, qrType, isDynamic, contentData, customization } = req.body;

    // Extracted safely by our HttpOnly authentication middleware
    const userId = req.user ? req.user._id : null;

    // Guard Rail: Guest users are barred from making trackable dynamic accounts
    if (isDynamic && !userId) {
      return res.status(401).json({
        status: "fail",
        message:
          "Authentication required to activate trackable Dynamic QR codes.",
      });
    }

    let finalValueToEmbed = contentData;
    let shortId = null;
    const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";

    // Execution block for Dynamic configuration requests
    if (isDynamic) {
      shortId = generateShortId();
      // The phone camera will be redirected to hit this server url bridge route first
      finalValueToEmbed = `${baseUrl}/r/${shortId}`;
    }

    // Insert configuration record neatly into MongoDB Atlas
    const savedQr = await QrCode.create({
      userId,
      name: name || "Untitled QR Code",
      qrType,
      isDynamic,
      contentData, // Saves original text/link configuration securely
      shortId,
      customization: {
        foregroundColor: customization?.foregroundColor || "#0f172a",
        backgroundColor: customization?.backgroundColor || "#ffffff",
        dotStyle: customization?.dotStyle || "square",
      },
    });

    res.status(201).json({
      status: "success",
      // Send this back so the React canvas redraws the correct code box profile live!
      qrValue: finalValueToEmbed,
      qrDetails: savedQr,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// @desc    2. Intercept Public Smartphone Scans, Log Analytics, Forward User
// @route   GET /r/:shortId
export const handleRedirect = async (req, res) => {
  try {
    const { shortId } = req.params;

    // Look up the routing bridge document map inside MongoDB
    const qr = await QrCode.findOne({ shortId });

    if (!qr) {
      return res
        .status(404)
        .send("<h1>Error 404: QR Code Routing Expired or Deleted</h1>");
    }

    // Up the scan dashboard counter by 1 atomatically
    qr.scanCount += 1;
    await qr.save();

    // Fire a 302 HTTP protocol forwarding header command straight to the phone browser
    res.redirect(qr.contentData);
  } catch (err) {
    console.error("Redirect Error:", err.message);
    res
      .status(500)
      .send("<h3>Temporary connection error processing your scan.</h3>");
  }
};

// @desc    Update a Dynamic QR Code target destination URL
// @route   PATCH /api/qrs/update-destination/:id
export const updateQrDestination = async (req, res) => {
  try {
    const { id } = req.params;
    const { newDestinationUrl } = req.body;

    // 1. Validation check for missing input parameters
    if (!newDestinationUrl) {
      return res
        .status(400)
        .json({ status: "fail", message: "New destination URL is required." });
    }

    // 2. Locate the specific QR code configuration record
    const qr = await QrCode.findById(id);

    if (!qr) {
      return res
        .status(404)
        .json({ status: "fail", message: "QR Code not found." });
    }

    // 3. Security Guard Rail: Ensure the logged-in user actually owns this record
    if (qr.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "fail",
        message: "Unauthorized. You do not own this QR code.",
      });
    }

    // 4. Premium Capability Guard: Static codes cannot change their value profiles
    if (!qr.isDynamic) {
      return res.status(400).json({
        status: "fail",
        message:
          "Static QR codes cannot be modified. Create a Dynamic QR code to use this feature.",
      });
    }

    // 5. Update the pointer destination inside MongoDB
    qr.contentData = newDestinationUrl;
    await qr.save();

    res.status(200).json({
      status: "success",
      message: "Destination URL re-routed successfully!",
      updatedQr: qr,
    });
  } catch (err) {
    console.error("Update Destination Error:", err.message);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error while re-routing destination.",
    });
  }
};

// @desc    Delete a specific user QR code configuration record from database history
// @route   DELETE /api/qrs/delete/:id
export const deleteQrCode = async (req, res) => {
  try {
    const { id } = req.params;

    // Locate the document matching the object ID parameter AND verify current user ownership
    const qr = await QrCode.findOne({ _id: id, userId: req.user._id });

    if (!qr) {
      return res.status(404).json({
        status: "fail",
        message:
          "QR Code not found or you do not have permission to remove it.",
      });
    }

    // Completely drop the item mapping record from your cluster collections
    await qr.deleteOne();

    res.status(200).json({
      status: "success",
      message: "QR code configuration completely cleared from history.",
    });
  } catch (err) {
    console.error("Delete QR Error:", err.message);
    res.status(500).json({
      status: "error",
      message: "Internal server failure handling item cleanup.",
    });
  }
};

// @desc    Get all QR codes created by the logged-in user + calculate summary metrics
// @route   GET /api/qrs/my-qrs
// @access  Protected (Requires auth cookie)
export const getUserQrCodes = async (req, res) => {
  try {
    // 1. Fetch all QR codes matching the logged-in user's ID (sorted by newest first)
    const qrCodes = await QrCode.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    // 2. Initialize aggregate dashboard analytic numbers
    const totalQrCodes = qrCodes.length;
    let totalScans = 0;
    let activeDynamicQRs = 0;

    // 3. Loop through user database records to calculate sums
    qrCodes.forEach((qr) => {
      totalScans += qr.scanCount; // Sum up total historical scan hits
      if (qr.isDynamic) {
        activeDynamicQRs++; // Track total dynamic vs static ratio count
      }
    });

    // 4. Return metrics payload block alongside the raw records array to the React frontend
    res.status(200).json({
      status: "success",
      metrics: {
        totalQrCodes,
        totalScans,
        activeDynamicQRs,
      },
      data: qrCodes,
    });
  } catch (err) {
    console.error("Fetch Dashboard Data Error:", err.message);
    res.status(500).json({
      status: "error",
      message:
        "Failed to retrieve your dashboard collection data from the server.",
    });
  }
};


// @desc    Update a Dynamic QR Code target destination URL link mapping
// @route   PATCH /api/qrs/update-destination/:id
// @access  Protected (Requires standard header authorization token verify)
// export const updateQrDestination = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { newDestinationUrl } = req.body;

//     // 1. Data Integrity Guard Rail: Verify a payload value was passed
//     if (!newDestinationUrl) {
//       return res.status(400).json({
//         status: "fail",
//         message: "A new destination URL link target string is required.",
//       });
//     }

//     // 2. Fetch the existing asset configuration document from MongoDB
//     const qr = await QrCode.findById(id);

//     if (!qr) {
//       return res.status(404).json({
//         status: "fail",
//         message: "No matching QR code configuration found in database.",
//       });
//     }

//     // 3. Security Check: Verify current token user owns this item asset
//     // req.user._id is populated dynamically by our header auth protect middleware
//     if (qr.userId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({
//         status: "fail",
//         message:
//           "Access Denied. You do not have permission to alter this QR code routing destination.",
//       });
//     }

//     // 4. Feature Constraint Guard Rail: Static codes cannot change their target values
//     if (!qr.isDynamic) {
//       return res.status(400).json({
//         status: "fail",
//         message:
//           "Static QR codes cannot be edited. Please construct a trackable Dynamic QR code parameter profile instead.",
//       });
//     }

//     // 5. Apply the update mutation directly inside the MongoDB dataset collection
//     qr.contentData = newDestinationUrl;
//     await qr.save();

//     res.status(200).json({
//       status: "success",
//       message: "Dynamic QR Code link target re-routed successfully!",
//       data: qr,
//     });
//   } catch (err) {
//     console.error("Backend Update Target URL Error:", err.message);
//     res.status(500).json({
//       status: "error",
//       message:
//         "Internal server failure processing dynamic re-routing update configurations.",
//     });
//   }
// };
