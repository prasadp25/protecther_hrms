const { executeQuery } = require('../config/database');

// ==============================================
// GET INSURANCE SETTINGS
// ==============================================
const getInsuranceSettings = async (req, res) => {
  try {
    const company_id = req.query.company_id || req.user.company_id;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    const query = `
      SELECT id, company_id, insurance_provider, hospital_list_url,
             created_at, updated_at
      FROM company_settings
      WHERE company_id = ?
    `;

    const settings = await executeQuery(query, [company_id]);

    // Return settings or defaults
    const data = settings.length > 0 ? settings[0] : {
      company_id: parseInt(company_id),
      insurance_provider: 'Bhima Kavach',
      hospital_list_url: null
    };

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get insurance settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insurance settings',
      error: error.message
    });
  }
};

// ==============================================
// UPDATE INSURANCE SETTINGS
// ==============================================
const updateInsuranceSettings = async (req, res) => {
  try {
    const { insurance_provider, hospital_list_url } = req.body;
    const company_id = req.body.company_id || req.user.company_id;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    // Check if settings exist
    const existing = await executeQuery(
      'SELECT id FROM company_settings WHERE company_id = ?',
      [company_id]
    );

    if (existing.length > 0) {
      // Update existing settings
      const updates = [];
      const params = [];

      if (insurance_provider !== undefined) {
        updates.push('insurance_provider = ?');
        params.push(insurance_provider);
      }
      if (hospital_list_url !== undefined) {
        updates.push('hospital_list_url = ?');
        params.push(hospital_list_url);
      }

      if (updates.length > 0) {
        params.push(company_id);
        await executeQuery(
          `UPDATE company_settings SET ${updates.join(', ')} WHERE company_id = ?`,
          params
        );
      }
    } else {
      // Insert new settings
      await executeQuery(
        `INSERT INTO company_settings (company_id, insurance_provider, hospital_list_url)
         VALUES (?, ?, ?)`,
        [company_id, insurance_provider || 'Bhima Kavach', hospital_list_url || null]
      );
    }

    // Fetch updated settings
    const updated = await executeQuery(
      'SELECT * FROM company_settings WHERE company_id = ?',
      [company_id]
    );

    res.status(200).json({
      success: true,
      message: 'Insurance settings updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Update insurance settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update insurance settings',
      error: error.message
    });
  }
};

module.exports = {
  getInsuranceSettings,
  updateInsuranceSettings
};
