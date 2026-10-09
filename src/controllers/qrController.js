import QrCode from "../models/QrCode.js";
import ScanEvent from "../models/ScanEvent.js"; // 1. Import new model
import geoip from "geoip-lite"; // 2. Import lookup library
import crypto from "node:crypto"; // Core native optimized cryptographic binary engine
import User from "../models/User.js";
import { fileViewerTemplate } from "../../templates/fileViewerTemplate.js";
import { vCardViewerTemplate } from "../../templates/vCardViewerTemplate.js";

// Helper to generate a fast, unique 6-character routing tag
const generateShortId = () => Math.random().toString(36).substring(2, 8);
const generateFallbackRefId = () =>
  `ord_${crypto.randomBytes(8).toString("hex")}`;

// @desc    Create and save a new QR code configuration (Supports Custom & Auto-Generated Reference IDs)
// @route   POST /v1/qrs/create

export const createQrCode = async (req, res) => {
  try {
    const {
      name,
      qrType,
      isDynamic,
      contentData,
      customization,
      externalRefId,
    } = req.body;

    const userId = req.user ? req.user._id : null;
    if (userId) {
      return res.status(400).json({
        status: "success",
        message: "You dont have an account , create one for free",
      });
    }

    if (isDynamic && !userId) {
      return res.status(401).json({
        status: "fail",
        message:
          "Authentication required to activate trackable Dynamic QR codes.",
      });
    }

    let finalValueToEmbed = contentData;
    let shortId = null;

    const protocol = req.protocol;
    const host = req.get("host");

    if (isDynamic && userId) {
      // Fetch user details to check account plan status
      const user = await User.findById(userId);
      const isPremium = user?.plan === "premium";

      // Find the highest sequence number created by this user
      const lastQr = await QrCode.findOne({ userId })
        .sort({ qrNumber: -1 })
        .exec();
      const currentCount = lastQr?.qrNumber;
      //   lastQr.qrNumber = 0;
      //    lastQr.save();
      //   return res.status(403).json({
      //     status: "fail",
      //     limitReached: true,
      //     message: "Done",
      //   });
      // Enforce 10 Dynamic QR limit for Free Tier
      if (!isPremium && currentCount >= 10) {
        return res.status(403).json({
          status: "fail",
          limitReached: true,
          message:
            "Free Tier limit reached (10 Dynamic QR Codes max). Please upgrade to Premium to create more.",
        });
      }

      shortId = generateShortId();
      finalValueToEmbed = `${protocol}://${host}/v1/qrs/${shortId}`;
    }

    // Determine the next non-decrementing QR sequence number for this user
    let nextQrNumber = 1;

    if (!userId) {
      const highestQr = await QrCode.findOne({ userId })
        .sort({ qrNumber: -1 })
        .exec();
      if (highestQr && highestQr.qrNumber) {
        nextQrNumber = highestQr.qrNumber + 1;
      }
    }

    const verifiedRefId =
      externalRefId && externalRefId.trim() !== ""
        ? externalRefId.trim()
        : generateFallbackRefId();

    const savedQr = await QrCode.create({
      userId,
      qrNumber: nextQrNumber,
      name: name || "Untitled QR Code",
      externalRefId: verifiedRefId,
      qrType,
      isDynamic,
      contentData,
      shortId,
      customization: {
        foregroundColor: customization?.foregroundColor || "#0f172a",
        backgroundColor: customization?.backgroundColor || "#ffffff",
        dotStyle: customization?.dotStyle || "square",
      },
    });

    res.status(201).json({
      status: "success",
      qrValue: finalValueToEmbed,
      externalRefId: savedQr.externalRefId,
      qrDetails: savedQr,
    });
  } catch (err) {
    console.log(err);
    if (err.code === 11000 && err.keyValue?.externalRefId) {
      return res.status(400).json({
        status: "fail",
        message:
          "This externalRefId is already associated with another QR campaign inside our database records.",
      });
    }
    res.status(500).json({ status: "error", message: err.message });
  }
};

// Helper function to extract a clean device and browser from User-Agent string
const parseUserAgent = (uaString) => {
  if (!uaString)
    return { device: "Unknown Mobile", browser: "Unknown Browser" };

  let device = "Android Mobile";
  if (uaString.includes("iPhone")) device = "iOS (iPhone)";
  else if (uaString.includes("iPad")) device = "Tablet Device";
  else if (uaString.includes("Macintosh") || uaString.includes("Windows"))
    device = "Desktop Web";

  let browser = "Browser";
  if (uaString.includes("Safari") && !uaString.includes("Chrome"))
    browser = "Safari";
  else if (uaString.includes("Chrome")) browser = "Chrome";
  else if (uaString.includes("Firefox")) browser = "Firefox";

  return { device, browser: `${browser}` };
};

// @desc    Intercept Public QR Scans, Process Device & Geo-IP Telemetry, Handle File Views or URL Redirects
// @route   GET /v1/qrs/:shortId
export const handleRedirect = async (req, res) => {
  try {
    const { shortId } = req.params;

    // 1. Locate the routing bridge document map inside MongoDB using the shortId parameter
    const qr = await QrCode.findOne({ shortId });
    if (!qr) {
      return res
        .status(404)
        .send("<h1>Error 404: Link Deleted or Expired</h1>");
    }

    // 2. Capture Raw Network Data from the scanning browser
    const userAgentRaw = req.headers["user-agent"];
    const clientIp =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

    // Split array if IP passes multiple proxy load balancers or Cloudflare gates cleanly
    const cleanIp = clientIp.split(",")[0].trim();

    // 3. Process Telemetry Breakdown (Device & Location)
    const { device, browser } = parseUserAgent(userAgentRaw);
    const geo = geoip.lookup(
      cleanIp === "::1" || cleanIp === "127.0.0.1" ? "8.8.8.8" : cleanIp,
    ); // Uses stable fallback for local developer tracking mockups

    // 4. Save a distinct log entry event row to MongoDB
    await ScanEvent.create({
      qrCodeId: qr._id,
      device: `${device} (${browser})`,
      browser,
      country: geo ? geo.country : "Ghana", // Defaults cleanly if geo lookup is restricted
      countryCode: geo ? geo.country : "GH",
      ipAddress: cleanIp,
    });

    // 5. Update the main counter counter on the primary QR document
    qr.scanCount += 1;
    await qr.save();

    // 🚀 6. SEPARATED VIEW ROUTING: Call our external template file instead of bloating this script
    if (qr.qrType === "image") {
      const htmlPageContent = fileViewerTemplate(
        qr.name,
        qr.contentData,
        shortId,
      );
      return res.send(htmlPageContent);
    }

    if (qr.qrType === "vcard") {
      // We will build this template next to serve contacts cleanly without crashing
      const htmlVcardContent = vCardViewerTemplate(
        qr.name,
        qr.contentData,
        shortId,
      );
      return res.send(htmlVcardContent);
    }

    // 7. Absolute protocol escape validation redirect for standard website URL links
    let targetUrl = qr.contentData.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    return res.redirect(targetUrl);
  } catch (err) {
    console.error("Telemetry Redirect Failure:", err.message);
    return res.status(500).send("<h3>Connection error logging metrics.</h3>");
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

// @desc    Delete a specific user QR code con
// @desc    Delete a specific user QR code configuration record and its scan tracking history
// @route   DELETE /v1/qrs/delete/:id
// @access  Protected (Requires standard header authorization token verify)
export const deleteQrCode = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Locate the document matching the object ID parameter AND verify current user ownership
    const qr = await QrCode.findOne({ _id: id, userId: req.user._id });

    if (!qr) {
      return res.status(404).json({
        status: "fail",
        message:
          "QR Code not found or you do not have permission to remove it.",
      });
    }

    // 2. 🚀 NEW: Bulk delete all corresponding scan logs associated with this specific QR code ID
    const deletedLogs = await ScanEvent.deleteMany({ qrCodeId: id });
    console.log(
      `Successfully cleared ${deletedLogs.deletedCount} scan telemetry logs from database.`,
    );

    // 3. Completely drop the primary QR item mapping record from your collection
    await qr.deleteOne();

    res.status(200).json({
      status: "success",
      message:
        "QR code and all its corresponding tracking data cleared successfully.",
    });
  } catch (err) {
    console.error("Delete QR & Logs Error:", err.message);
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

// @desc    Calculate REAL Aggregated Scan Metrics out of MongoDB Log collections
// @route   GET /v1/qrs/analytics

export const getQrAnalytics = async (req, res) => {
  try {
    const { campaign, range } = req.query;
    const userId = req.user._id;

    // 1. Date filter range setup
    let days = 30;
    if (range === "7d") days = 7;
    if (range === "90d") days = 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 2. Fetch user QR campaigns for filter options
    const userQrs = await QrCode.find({ userId });
    const qrIds = userQrs.map((q) => q._id);

    const campaignOptions = [
      { id: "all", name: "All Campaigns (Aggregated)" },
      ...userQrs.map((q) => ({ id: q._id.toString(), name: q.name })),
    ];

    // 3. Build aggregation match query
    let eventFilter = {
      qrCodeId: { $in: qrIds },
      createdAt: { $gte: startDate },
    };

    if (campaign && campaign !== "all") {
      eventFilter.qrCodeId = campaign;
    }

    // 4. Fetch telemetry events
    const allEvents = await ScanEvent.find(eventFilter).sort({ createdAt: -1 });
    const totalScans = allEvents.length;

    const uniqueIps = [
      ...new Set(allEvents.map((e) => e.ipAddress).filter(Boolean)),
    ];
    const uniqueScanners = uniqueIps.length;

    // 5. Geographic breakdown calculation
    const locationMap = {};
    allEvents.forEach((e) => {
      const countryCode = e.country || "Unknown";
      locationMap[countryCode] = (locationMap[countryCode] || 0) + 1;
    });

    // Comprehensive Country Name Mapper including all African nations
    const countryNameMap = {
      // Original Existing Whitelists
      US: "United States",
      GB: "United Kingdom",
      CA: "Canada",
      DE: "Germany",

      // West Africa
      GH: "Ghana",
      NG: "Nigeria",
      CI: "Ivory Coast",
      SN: "Senegal",
      LR: "Liberia",
      SL: "Sierra Leone",
      GM: "Gambia",
      TG: "Togo",
      BJ: "Benin",
      BF: "Burkina Faso",
      NE: "Niger",
      ML: "Mali",
      CV: "Cape Verde",
      GN: "Guinea",
      GW: "Guinea-Bissau",
      MR: "Mauritania",

      // East Africa
      KE: "Kenya",
      TZ: "Tanzania",
      UG: "Uganda",
      RW: "Rwanda",
      ET: "Ethiopia",
      SO: "Somalia",
      SD: "Sudan",
      SS: "South Sudan",
      ER: "Eritrea",
      DJ: "Djibouti",
      BI: "Burundi",
      KM: "Comoros",
      MG: "Madagascar",
      MU: "Mauritius",
      SC: "Seychelles",

      // Southern Africa
      ZA: "South Africa",
      ZW: "Zimbabwe",
      ZM: "Zambia",
      MW: "Malawi",
      MO: "Mozambique",
      NA: "Namibia",
      BW: "Botswana",
      LS: "Lesotho",
      SZ: "Eswatini",
      AO: "Angola",

      // North Africa
      EG: "Egypt",
      MA: "Morocco",
      DZ: "Algeria",
      TN: "Tunisia",
      LY: "Libya",

      // Central Africa
      CM: "Cameroon",
      CD: "DR Congo",
      CG: "Republic of Congo",
      GA: "Gabon",
      GQ: "Equatorial Guinea",
      TD: "Chad",
      CF: "Central African Republic",
      ST: "São Tomé and Príncipe",
    };

    const locationsBreakdown = Object.keys(locationMap)
      .map((code) => ({
        country: countryNameMap[code] || code,
        code: code,
        scans: locationMap[code],
        percentage:
          totalScans > 0
            ? Math.round((locationMap[code] / totalScans) * 100)
            : 0,
      }))
      .sort((a, b) => b.scans - a.scans);

    // 6. Device breakdown calculation
    const deviceMap = {};
    allEvents.forEach((e) => {
      const cleanDeviceName = e.device
        ? e.device.split(" (")[0]
        : "Desktop Web";
      deviceMap[cleanDeviceName] = (deviceMap[cleanDeviceName] || 0) + 1;
    });

    const devicesBreakdown = Object.keys(deviceMap).map((dev) => ({
      device: dev,
      count: deviceMap[dev],
      percentage:
        totalScans > 0 ? Math.round((deviceMap[dev] / totalScans) * 100) : 0,
    }));

    // 7. Recent log formatting (normalized properties)
    const dynamicLogs = allEvents.slice(0, 10).map((e) => {
      const matchedCampaign = userQrs.find(
        (q) => q._id.toString() === e.qrCodeId?.toString(),
      );

      let maskedIp = "Unknown";
      if (e.ipAddress) {
        maskedIp =
          e.ipAddress.length > 6
            ? `${e.ipAddress.substring(0, 6)}...xxx`
            : e.ipAddress;
      }

      // Automatically maps country code to full name in the logs list too
      const displayCountry =
        countryNameMap[e.country] || e.country || "Unknown";

      return {
        id: e._id.toString(),
        campaign: matchedCampaign ? matchedCampaign.name : "Campaign Asset",
        device: e.device || "Desktop Web",
        location: e.city ? `${e.city}, ${displayCountry}` : displayCountry,
        ip: maskedIp,
        timestamp: e.createdAt,
      };
    });

    res.status(200).json({
      status: "success",
      campaigns: campaignOptions,
      metrics: {
        totalScans,
        scansChange: totalScans > 0 ? "+100%" : "0%",
        uniqueScanners,
        uniqueChange: uniqueScanners > 0 ? "+100%" : "0%",
        topCountry: locationsBreakdown[0]?.country || "N/A",
        topCountryPercent: locationsBreakdown[0]
          ? `${locationsBreakdown[0].percentage}%`
          : "0%",
        peakTime: "Realtime Continuous Feed",
      },
      locations: locationsBreakdown,
      devices: devicesBreakdown,
      logs: dynamicLogs,
    });
  } catch (err) {
    console.error("Analytics Pipeline Processing Error:", err.message);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve analytics metrics.",
    });
  }
};

// @desc    Upload an image file to secure cloud asset hosting (Cloudinary)
// @route   POST /v1/qrs/upload-image
// @access  Protected (Requires header authorization token or developer API key verify)
export const uploadImageFile = async (req, res) => {
  try {
    console.log("Backend Cloudina one:");
    // 1. Check if Multer failed to catch a file attachment stream input
    if (!req.file) {
      return res.status(400).json({
        status: "fail",
        message: "No image file provided or invalid file format type.",
      });
    }
    console.log("Backend Cloudina one:");

    // 2. 🚀 THE CLOUDINARY UPGRADE: Extract the permanent secure cloud URL directly
    // Multer-Storage-Cloudinary automatically handles the cloud stream and maps the path here!
    const imageUrl = req.file.path;

    // 3. Return the absolute cloud asset url pointers back to the React UI context frame
    return res.status(201).json({
      status: "success",
      message:
        "Image uploaded successfully to secure Cloudinary cloud storage.",
      filename: req.file.filename,
      imageUrl: imageUrl, // 🚀 Handed back instantly to the frontend to pass to 'contentData'
    });
  } catch (err) {
    console.error(
      "Backend Cloudinary Image Upload Controller Crash:",
      err.message,
    );
    res.status(500).json({
      status: "error",
      message:
        "Internal server error occurred while writing the cloud image asset.",
    });
  }
};
