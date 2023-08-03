export default function pointInSphere(sphere, pointLPS) {
    const { center, radius } = sphere;
    return ((pointLPS[0] - center[0]) ** 2 +
        (pointLPS[1] - center[1]) ** 2 +
        (pointLPS[2] - center[2]) ** 2 <=
        radius ** 2);
}
//# sourceMappingURL=pointInSphere.js.map