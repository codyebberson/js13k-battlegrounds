"use strict";

const Sequelize = require('sequelize');
const LIMIT = 13312;
let SIZE = 0;
let Storage;

/**
 * Asyncronuos key/value store
 * @module storage
 */
module.exports = {

    /**
     * Init the storage database
     * @async
     * @returns {Promise<void>}
     */
    init: async (url) => {
        const sequelize = new Sequelize(url, { logging: false });
        await sequelize.authenticate();
        Storage = sequelize.define('storage', {
            key: {
                type: Sequelize.STRING(LIMIT),
                primaryKey: true
            },
            value: {
                type: Sequelize.STRING(LIMIT)
            },
            size: {
                type: Sequelize.INTEGER
            }
        });
        await Storage.sync();
        SIZE = await Storage.sum('size') || 0;
    },

    /**
     * Storage inteface
     */
    interface: {

        /**
         * Get key by index number
         * @async
         * @function
         * @param {number} index - Index
         * @returns {Promise<string>} - Key
         */
        key: async (index) => {
            let result = await Storage.findAll({
                order: [['key', 'ASC']],
                offset: parseInt(index) || 0,
                limit: 1
            });
            let item = result.shift();
            return item ? item.key : undefined;
        },

        /**
         * Get value
         * @async
         * @function
         * @param {string} key
         * @param {*} defaultValue
         * @param {boolean} [json=true] - Convert value to JSON
         * @returns {Promise<*>} - Value
         */
        get: async (key, defaultValue, json = true) => {
            key = String(key);
            let item = await Storage.findByPk(key);
            let value = defaultValue;
            if (item) {
                try {
                    value = json ? JSON.parse(item.value) : item.value;
                } catch(e) {
                }
            }
            return value;
        },

        /**
         * Set value
         * @async
         * @function
         * @param {string} key
         * @param {*} value
         * @param {boolean} [json=true] - Convert value to JSON
         * @returns {Promise<boolean>} - Returns false on failure
         */
        set: async (key, value, json = true) => {
            key = String(key);
            value = json ? JSON.stringify(value) : String(value);
            let length = Buffer.byteLength(key + value, 'utf8');
            let item = await Storage.findByPk(String(key));
            if (item && length - item.size + SIZE <= LIMIT) {
                SIZE += length - item.size;
                item.value = value;
                item.size = length;
                await item.save();
                return true;
            }
            if (!item && length + SIZE <= LIMIT) {
                SIZE += length;
                await Storage.create({
                    key: String(key),
                    value: value,
                    size: length
                });
                return true;
            }
            return false;
        },

        /**
         * Remove value
         * @async
         * @function
         * @param {string} key
         * @returns {Promise<void>}
         */
        remove: async (key) => {
            key = String(key);
            let item = await Storage.findByPk(key);
            if (item) {
                SIZE -= item.size;
                await item.destroy();
            }
        },

        /**
         * Clear all keys and values
         * @async
         * @function
         * @returns {Promise<void>}
         */
        clear: async () => {
            await Storage.destroy({
                truncate: true
            });
            SIZE = 0;
        },

        /**
         * Get the number of keys
         * @async
         * @function
         * @returns {Promise<number>}
         */
        length: async () => {
            let count = await Storage.count();
            return count;
        },

        /**
         * Get the storage size
         * @function
         * @returns {number}
         */
        size: () => {
            return SIZE;
        }
    }
};