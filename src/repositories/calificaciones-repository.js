import pkg from 'pg'
import config from './../configs/db-config.js';      // Traigo la configuracion de la base de datos.
import LogHelper from './../helpers/log-helper.js'

const { Pool }  = pkg;

export default class CalificacionesRepository {
    constructor() {
        // Se ejecuta siempre, (al instanciar la clase)
        console.log('Estoy en: CalificacionesRepository.constructor()');
        this.DBPool     = null;
    }

    getDBPool = () => {
        if (this.DBPool == null){
            this.DBPool = new Pool(config);
        }
        return this.DBPool;
    }

    getAllAsync = async () => {
        console.log(`CalificacionesRepository.getAllAsync()`);
        let returnArray = null;
        
        try {
            const sql = `SELECT calificaciones.id, calificaciones.id_alumno, alumnos.nombre as nombre_alumno, alumnos.apellido as apellido_alumno,
            calificaciones.id_materia, materias.nombre as nombre_materia, calificaciones.nota, calificaciones.fecha
            FROM calificaciones INNER JOIN materias ON materias.id = calificaciones.id_materia
            INNER JOIN alumnos ON alumnos.id = calificaciones.id_alumno`;
            const resultPg = await this.getDBPool().query(sql);
            returnArray = resultPg.rows;
        } catch (error) {
            LogHelper.logError(error);
        }
        return returnArray;
    }

    

    getByIdAsync = async (id) => {
        console.log(`CalificacionesRepository.getByIdAsync(${id})`);
        let returnEntity = null;
        try {
            const sql = `SELECT calificaciones.id, calificaciones.id_alumno, alumnos.nombre as nombre_alumno, alumnos.apellido as apellido_alumno,
            calificaciones.id_materia, materias.nombre as nombre_materia, calificaciones.nota, calificaciones.fecha
            FROM calificaciones INNER JOIN materias ON materias.id = calificaciones.id_materia
            INNER JOIN alumnos ON alumnos.id = calificaciones.id_alumno WHERE calificaciones.id=$1`;
            const values = [id];
            const resultPg = await this.getDBPool().query(sql, values);
            if (resultPg.rows.length > 0){
                returnEntity = resultPg.rows[0];
            }
        } catch (error) {
            LogHelper.logError(error);
        }
        return returnEntity;
    }

    getByAlumnoIdAsync = async (id) => {
        console.log(`CalificacionesRepository.getByAlumnoIdAsync(${id})`);
        let returnEntity = null;
        try {
            const sql = `SELECT calificaciones.id, calificaciones.id_materia, materias.nombre as nombre_materia, 
            calificaciones.nota, calificaciones.fecha
            FROM calificaciones INNER JOIN materias ON materias.id = calificaciones.id_materia
            WHERE calificaciones.id_alumno=$1`;
            const values = [id];
            const resultPg = await this.getDBPool().query(sql, values);
            if (resultPg.rows.length > 0){
                returnEntity = resultPg.rows;
            }
        } catch (error) {
            LogHelper.logError(error);
        }
        return returnEntity;
    }



    createAsync = async (entity) => {
        console.log(`CalificacionesRepository.createAsync(${JSON.stringify(entity)})`);
        let newId = 0;

        try {
            const sql = `INSERT INTO calificaciones (nombre) VALUES ($1) RETURNING id`;
            const values = [entity?.nombre ?? ''];
            const resultPg = await this.getDBPool().query(sql, values);
            newId = resultPg.rows[0].id;
        } catch (error) {
            LogHelper.logError(error);
        }
        return newId;
    }

    updateAsync = async (entity) => {
        console.log(`CalificacionesRepository.updateAsync(${JSON.stringify(entity)})`);
        let rowsAffected = 0;
        let id = entity.id;

        try {
            const sql = `UPDATE calificaciones SET nombre = $2 WHERE id = $1`;
            const values = [id, entity?.nombre ?? ''];
            const resultPg = await this.getDBPool().query(sql, values);
            rowsAffected = resultPg.rowCount;
        } catch (error) {
            LogHelper.logError(error);
        }
        return rowsAffected;
    }

    deleteByIdAsync = async (id) => {
        console.log(`CalificacionesRepository.deleteByIdAsync(${id})`);
        let rowsAffected = 0;

        try {
            const sql = `DELETE FROM materias WHERE id=$1`;
            const values = [id];
            const resultPg = await this.getDBPool().query(sql, values);
            rowsAffected = resultPg.rowCount;
        } catch (error) {
            LogHelper.logError(error);
        }
        return rowsAffected;
    }
}
