# See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

# This stage is used when running from VS in fast mode (Default for Debug configuration)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
# Install Azure CLI so DefaultAzureCredential can use AzureCliCredential in Docker.
# Credentials are provided at runtime via the ~/.azure volume mount in docker-compose.
RUN apt-get -o Acquire::Retries=3 update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg libgssapi-krb5-2 \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -sLS https://packages.microsoft.com/keys/microsoft.asc \
       | gpg --dearmor -o /etc/apt/keyrings/microsoft.gpg \
    && chmod a+r /etc/apt/keyrings/microsoft.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/microsoft.gpg] https://packages.microsoft.com/repos/azure-cli/ bookworm main" \
       > /etc/apt/sources.list.d/azure-cli.list \
    && apt-get -o Acquire::Retries=3 update \
    && apt-get install -y --no-install-recommends azure-cli \
    && rm -rf /var/lib/apt/lists/*
RUN apt-get -o Acquire::Retries=3 update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081


# This stage is used to build the service project
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["src/StarterKit.Data/StarterKit.Data.csproj", "src/StarterKit.Data/"]
COPY ["src/StarterKit.Core/StarterKit.Core.csproj", "src/StarterKit.Core/"]
COPY ["src/StarterKit.Auth/StarterKit.Auth.csproj", "src/StarterKit.Auth/"]
COPY ["src/StarterKit.MobileApi/StarterKit.MobileApi.csproj", "src/StarterKit.MobileApi/"]
RUN dotnet restore "./src/StarterKit.MobileApi/StarterKit.MobileApi.csproj"
COPY . .
WORKDIR "/src/src/StarterKit.MobileApi"
RUN dotnet build "./StarterKit.MobileApi.csproj" -c $BUILD_CONFIGURATION -o /app/build

# This stage is used to publish the service project to be copied to the final stage
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./StarterKit.MobileApi.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# This stage is used in production or when running from VS in regular mode (Default when not using the Debug configuration)
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "StarterKit.MobileApi.dll"]
