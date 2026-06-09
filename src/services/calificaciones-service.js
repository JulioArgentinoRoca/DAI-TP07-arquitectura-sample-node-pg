import CalificacionesRepository from '../repositories/calificaciones-repository.js';

import AlumnosService from './alumnos-service.js';
import MateriasService from '../repositories/materias-repository.js'

export default class CalificacionesService {
    constructor() {
        console.log('Estoy en: CalificacionesService.constructor()');
        this.CalificacionesRepository = new CalificacionesRepository();
        this.AlumnosService = new AlumnosService()
        this.MateriasService= new MateriasService()
    }

    getAllAsync = async () => {
        console.log(`CalificacionesService.getAllAsync()`);
        const returnArray = await this.CalificacionesRepository.getAllAsync();
        return returnArray;
    }

    getByIdAsync = async (id) => {
        console.log(`CalificacionesService.getByIdAsync(${id})`);
        const returnEntity = await this.CalificacionesRepository.getByIdAsync(id);
        return returnEntity;
    }

    getByAlumnoIdAsync = async (id) => {
        console.log(`CalificacionesService.getByAlumnoIdAsync(${id})`);
        const returnEntity = await this.CalificacionesRepository.getByAlumnoIdAsync(id);
        return returnEntity;
    }

    createAsync = async (entity) =>{
        console.log(`CalificacionesService.createAsync(${JSON.stringify(entity)})`);
        if(!(this.notaIsValid(entity.nota))){throw new Error(`La nota debe ser un número entero entre 0 y 10.`)}

        
        if(!(await this.alumnoExists(entity.id_alumno))){throw new Error(`El alumno con id ${entity.id_alumno} no existe.`)}
        
        if(!(await this.materiaExists(entity.id_materia))){throw new Error(`La materia con id ${entity.id_materia} no existe.`)}

        const existing = await this.CalificacionesRepository.getByAlumnoAndMateriaAsync(entity.id_alumno, entity.id_materia)
        if(existing){throw new Error(`Ya existe una calificación para el alumno ${entity.id_alumno} en la materia ${entity.id_materia}.`)}

        const newId=this.CalificacionesRepository.createAsync(entity)
        return newId
    }

    updateAsync = async (entity) => {
        console.log(`CalificacionesService.updateAsync(${JSON.stringify(entity)})`);
        if(!(await this.CalificacionesRepository.getByIdAsync(entity.id))){throw new Error(`No se encontró la calificación (id: ${entity.id}).`)}

        if(entity.nota != null && !(this.notaIsValid(entity.nota))){throw new Error(`La nota debe ser un número entero entre 0 y 10.`)}

        const rowsAffected = await this.CalificacionesRepository.updateAsync(entity);
        return rowsAffected;
    }


    notaIsValid = async(nota) =>{
        const NOTA_MAXIMA=10
        const NOTA_MINIMA=0
        return (nota < NOTA_MAXIMA && nota > NOTA_MINIMA)
    }
    
    alumnoExists = async (idAlumno) =>{
        if(!idAlumno){return false}
        const alumno = await this.AlumnosService.getByIdAsync(idAlumno)
        return (alumno!=null ? true : false)
    }

    materiaExists = async (idMateria) =>{
        if(!idMateria){return false}
        const materia = await this.MateriasService.getByIdAsync(idMateria)
        return (materia!=null ? true : false)
    }

}
