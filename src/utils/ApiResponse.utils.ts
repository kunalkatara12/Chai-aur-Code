class ApiResponse {
  success: boolean;
  message: string;
  data: any;
  statusCode: boolean;

  constructor(statusCode: number, data: any, message: string = "Success") {
    this.success = statusCode < 400;
    this.message = "";
    this.data = data;
    this.statusCode = statusCode < 400;
  }
}
export { ApiResponse };
