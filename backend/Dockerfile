FROM golang:1.24-alpine AS builder

WORKDIR /src

RUN apk add --no-cache git build-base

COPY go.mod go.sum ./
RUN go mod download


COPY . .

RUN mkdir -p /src/uploads

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/backend ./...

FROM alpine:3.18
RUN apk add --no-cache ca-certificates
WORKDIR /app

COPY --from=builder /bin/backend /app/backend
COPY --from=builder /src/uploads /app/uploads
COPY --from=builder /src/migrations /app/migrations

ENV UPLOAD_PATH=/app/uploads
EXPOSE 8080

RUN mkdir -p /app/uploads

CMD ["/app/backend"]
