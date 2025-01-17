import type vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import type vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
export declare type Actor = vtkActor;
export declare type VolumeActor = vtkVolume;
export declare type ImageActor = vtkImageSlice;
export declare type ActorEntry = {
    uid: string;
    actor: Actor | VolumeActor | ImageActor;
    referenceId?: string;
    slabThickness?: number;
};
