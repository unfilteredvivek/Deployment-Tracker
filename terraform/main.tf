provider "aws" {
  region = "ap-south-1"
}

resource "aws_instance" "deployment_tracker" {
  ami                    = "ami-01a00762f46d584a1"
  instance_type          = "m7i-flex.large"
  availability_zone      = "ap-south-1b"
  subnet_id              = "subnet-0fedb31ec9a8e8c0e"
  vpc_security_group_ids = ["sg-0502a80bfc411f8fb"]
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
