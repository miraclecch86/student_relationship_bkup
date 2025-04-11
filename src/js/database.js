const { app } = require('electron');
const fs = require('fs').promises;
const path = require('path');

class Database {
    constructor() {
        if (!app.isReady()) {
            throw new Error('Database cannot be initialized before app is ready');
        }
        this.dbPath = path.join(app.getPath('userData'), 'database.json');
        this.initializeDB();
    }

    async initializeDB() {
        try {
            await fs.access(this.dbPath);
        } catch (error) {
            const initialData = {
                classes: [],
                students: {},
                relationships: {}
            };
            await fs.writeFile(this.dbPath, JSON.stringify(initialData, null, 2), 'utf8');
        }
    }

    async getData() {
        try {
            const data = await fs.readFile(this.dbPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading database:', error);
            return {
                classes: [],
                students: {},
                relationships: {}
            };
        }
    }

    async saveData(data) {
        try {
            await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving database:', error);
            throw new Error('Failed to save data to database');
        }
    }

    async getClasses() {
        const data = await this.getData();
        return data.classes;
    }

    async getStudents(classId) {
        if (!classId) throw new Error('Class ID is required');
        const data = await this.getData();
        return data.students[classId] || [];
    }

    async getRelationships(classId) {
        if (!classId) throw new Error('Class ID is required');
        const data = await this.getData();
        return data.relationships[classId] || [];
    }

    async addClass(className) {
        if (!className) throw new Error('Class name is required');
        const data = await this.getData();
        const newClass = {
            id: Date.now().toString(),
            name: className
        };
        data.classes.push(newClass);
        data.students[newClass.id] = [];
        data.relationships[newClass.id] = [];
        await this.saveData(data);
        return newClass;
    }

    async updateClass(classId, className) {
        if (!classId || !className) throw new Error('Class ID and name are required');
        const data = await this.getData();
        const classIndex = data.classes.findIndex(c => c.id === classId);
        if (classIndex === -1) throw new Error('Class not found');
        
        data.classes[classIndex].name = className;
        await this.saveData(data);
        return true;
    }

    async deleteClass(classId) {
        if (!classId) throw new Error('Class ID is required');
        const data = await this.getData();
        data.classes = data.classes.filter(c => c.id !== classId);
        delete data.students[classId];
        delete data.relationships[classId];
        await this.saveData(data);
    }

    async addStudent(classId, studentName) {
        if (!classId || !studentName) throw new Error('Class ID and student name are required');
        const data = await this.getData();
        if (!data.students[classId]) {
            data.students[classId] = [];
        }
        const newStudent = {
            id: Date.now().toString(),
            name: studentName
        };
        data.students[classId].push(newStudent);
        await this.saveData(data);
        return newStudent;
    }

    async updateStudent(classId, studentId, studentName) {
        if (!classId || !studentId || !studentName) {
            throw new Error('Class ID, student ID, and name are required');
        }
        const data = await this.getData();
        const students = data.students[classId];
        if (!students) throw new Error('Class not found');
        
        const studentIndex = students.findIndex(s => s.id === studentId);
        if (studentIndex === -1) throw new Error('Student not found');
        
        students[studentIndex].name = studentName;
        await this.saveData(data);
        return true;
    }

    async deleteStudent(classId, studentId) {
        if (!classId || !studentId) throw new Error('Class ID and student ID are required');
        const data = await this.getData();
        if (!data.students[classId]) throw new Error('Class not found');
        
        data.students[classId] = data.students[classId].filter(s => s.id !== studentId);
        data.relationships[classId] = data.relationships[classId].filter(r => 
            r.source !== studentId && r.target !== studentId);
        await this.saveData(data);
    }

    async updateRelationships(classId, relationships) {
        if (!classId || !Array.isArray(relationships)) {
            throw new Error('Class ID and valid relationships array are required');
        }
        const data = await this.getData();
        data.relationships[classId] = relationships;
        await this.saveData(data);
    }
}

module.exports = Database; 