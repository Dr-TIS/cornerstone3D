function roundNumber(value, precision = 2) {
    if (value === undefined || value === null || value === '')
        return 'NaN';
    value = Number(value);
    if (value < 0.0001)
        return `${value}`;
    const fixedPrecision = value >= 100
        ? precision - 2
        : value >= 10
            ? precision - 1
            : value >= 1
                ? precision
                : value >= 0.1
                    ? precision + 1
                    : value >= 0.01
                        ? precision + 2
                        : value >= 0.001
                            ? precision + 3
                            : precision + 4;
    return value.toFixed(fixedPrecision);
}
export default roundNumber;
//# sourceMappingURL=roundNumber.js.map