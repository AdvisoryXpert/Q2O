import axios from 'axios';
import API from '../apiConfig'; 

export const saveDealerAndQuotation = async (dealerData, total_price, product_id, user_id) => {
    try {
        const payload = {
            ...dealerData,
            tds_level: parseInt(dealerData.tds_level, 10),
            hardness_level: parseInt(dealerData.hardness_level, 10),
            total_price,
            product_id,
            user_id
        };

        const response = await axios.post(`${API}/dealer-quotation`, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        return response.data.quote_id;
    } catch (error) {
        console.error("Error saving dealer, quotation & item:", error.response?.data || error.message);
        return null;
    }
};
