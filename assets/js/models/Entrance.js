export default class Entrance {
  constructor(
    entranceId,
    buildingId,
    entranceName,
    latitude,
    longitude,
    isDefault,
    status
  ) {
    this.entranceId = entranceId;
    this.buildingId = buildingId;
    this.entranceName = entranceName;
    this.latitude = latitude;
    this.longitude = longitude;
    this.isDefault = isDefault;
    this.status = status;
  }
}