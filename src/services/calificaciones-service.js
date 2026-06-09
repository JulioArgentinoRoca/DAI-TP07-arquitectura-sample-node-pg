import CalificacionesRepository from '../repositories/calificaciones-repository.js';
import AlumnosRepository from '../repositories/alumnos-repository.js';
import MateriasRepository from '../repositories/materias-repository.js'

export default class CalificacionesService {
    constructor() {
        console.log('Estoy en: CalificacionesService.constructor()');
        this.CalificacionesRepository = new CalificacionesRepository();
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
        const NOTA_MAXIMA=10
        const NOTA_MINIMA=0
        console.log(`CalificacionesService.createAsync(${JSON.stringify(entity)})`);
        if(!(entity.nota < NOTA_MAXIMA && entity.nota > NOTA_MINIMA)){throw new Error(`La nota debe ser un número entero entre ${NOTA_MINIMA} y ${NOTA_MAXIMA}.`)}

        const alumnoRepo = new AlumnosRepository()
        const targetAlumno = await alumnoRepo.getByIdAsync(entity.id_alumno);
        if(!targetAlumno){throw new Error(`El alumno con id ${entity.id_alumno} no existe.`)}

        const materiaRepo = new MateriasRepository()
        const targetMateria =  await materiaRepo.getByIdAsync(entity.id_materia)
        if(!targetMateria){throw new Error(`La materia con id ${entity.id_materia} no existe.`)}

        const existing = await this.CalificacionesRepository.getByAlumnoAndMateriaAsync(entity.id_alumno, entity.id_materia)
        if(existing){throw new Error(`Ya existe una calificación para el alumno ${entity.id_alumno} en la materia ${entity.id_materia}.`)}

        const newId=this.CalificacionesRepository.createAsync(entity)
        return newId
    }
}
