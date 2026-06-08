import CalificacionesRepository from '../repositories/calificaciones-repository.js';

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
}
