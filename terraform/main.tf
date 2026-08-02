provider "aws" {
  region = "ap-south-1"
}

resource "aws_security_group" "deployment_tracker_sg" {
  name        = "launch-wizard-2"
  description = "launch-wizard-2 created 2026-07-20T10:13:01.903Z"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3003
    to_port     = 3003
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "deployment_tracker" {
  ami                    = "ami-01a00762f46d584a1"
  instance_type          = "m7i-flex.large"
  availability_zone      = "ap-south-1b"
  subnet_id              = "subnet-0fedb31ec9a8e8c0e"
  vpc_security_group_ids = [aws_security_group.deployment_tracker_sg.id]
  key_name               = "updated-DT"

  tags = {
    Name = "updated_DT"
  }

  root_block_device {
    volume_size           = 30
    volume_type            = "gp3"
    delete_on_termination  = true
  }
}
